#!/usr/bin/env node
import { Redis } from '@upstash/redis';
import 'dotenv/config';

async function testRedisConnection() {
  console.log('🔍 Environment check:');
  console.log('Has URL:', !!process.env.UPSTASH_REDIS_REST_URL);
  console.log('Has Token:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
  console.log('URL Preview:', process.env.UPSTASH_REDIS_REST_URL ? process.env.UPSTASH_REDIS_REST_URL.substring(0, 30) + '...' : 'undefined');

  try {
    console.log('\n🚀 Testing Redis connection...');
    const redis = Redis.fromEnv();
    
    // Test basic operations
    const testKey = 'test-connection';
    const testValue = { message: 'Redis is working!', timestamp: new Date().toISOString() };
    
    console.log('📝 Setting test value...');
    await redis.set(testKey, JSON.stringify(testValue));
    
    console.log('📖 Getting test value...');
    const result = await redis.get(testKey);
    console.log('Raw result:', result, 'Type:', typeof result);
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    
    console.log('🧹 Cleaning up test data...');
    await redis.del(testKey);
    
    console.log('\n✅ Redis connection successful!');
    console.log('Test result:', parsedResult);
  } catch (error) {
    console.error('\n❌ Redis connection failed:');
    console.error('Error:', error.message);
    console.error('Details:', error);
  }
}

testRedisConnection();