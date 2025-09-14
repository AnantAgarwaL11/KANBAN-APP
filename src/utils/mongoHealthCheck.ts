import { connectToDB } from './database';

export async function checkMongoConnection() {
  try {
    const conn = await connectToDB();
    await conn.db.command({ ping: 1 });
    console.log('MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
}

export async function getMongoStats() {
  try {
    const conn = await connectToDB();
    const stats = await conn.db.command({ serverStatus: 1 });
    return {
      ok: true,
      connections: stats.connections,
      uptime: stats.uptime,
      memory: stats.mem
    };
  } catch (error) {
    console.error('Failed to get MongoDB stats:', error);
    return { ok: false, error: error.message };
  }
}
