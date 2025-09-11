export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.status(200).json({ 
    status: 'OK', 
    message: 'Scheduler API is running',
    timestamp: new Date().toISOString(),
    environment: {
      hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      nodeEnv: process.env.NODE_ENV
    }
  });
}