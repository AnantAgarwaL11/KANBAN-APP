import { NextApiRequest, NextApiResponse } from 'next';
import { checkMongoConnection, getMongoStats } from '../../utils/mongoHealthCheck';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      return res.status(503).json({ 
        status: 'error',
        message: 'Database connection failed'
      });
    }

    const stats = await getMongoStats();
    
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: stats
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
}
