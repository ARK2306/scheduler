// Simple test endpoint to verify Redis connectivity
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to connect to Redis
    const redis = Redis.fromEnv();
    
    // Test basic operations
    const testKey = 'test-connection';
    const testValue = { message: 'Redis is working!', timestamp: new Date().toISOString() };
    
    // Set a test value
    await redis.set(testKey, JSON.stringify(testValue));
    
    // Get the test value back
    const result = await redis.get(testKey);
    const parsedResult = JSON.parse(result);
    
    // Clean up test data
    await redis.del(testKey);
    
    return res.status(200).json({
      success: true,
      message: 'Redis connection successful',
      testResult: parsedResult,
      environment: {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      }
    });
  } catch (error) {
    console.error('Redis test error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Redis connection failed',
      details: error.message,
      environment: {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      }
    });
  }
}