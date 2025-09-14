import { Server } from 'socket.io';

interface msgType {
  id: string;
  data: any;
}

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('[WS] => First use, starting socket.io server');

    const io = new Server(res.socket.server, {
      pingTimeout: 60000,
      cors: {
        origin: process.env.NEXT_PUBLIC_BASE_URL,
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`[WS] => Client connected: ${socket.id}`);

      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`[WS] => Client ${socket.id} joined room: ${roomId}`);
      });

      socket.on('error', (error) => {
        console.error('[WS] => Socket error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log(`[WS] => Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      const actions = [
        'changeBoard',
        'moveList',
        'updateListTitle',
        'archiveList',
        'createList',
        'moveCard',
        'archiveCard',
        'updateCardData',
        'createCard',
      ];

      for (const action of actions) {
        socket.on(action, (msg: msgType) => {
          try {
            if (!msg || !msg.id) {
              throw new Error(`Invalid message format for action: ${action}`);
            }
            socket.broadcast.to(msg.id).emit(action, msg.data ?? null);
            console.log(`[WS] => Broadcasted ${action} to room ${msg.id}`);
          } catch (error) {
            console.error(`[WS] => Error in ${action} handler:`, error);
            socket.emit('error', { action, message: error.message });
          }
        });
      }
    });

    res.socket.server.io = io;
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;
