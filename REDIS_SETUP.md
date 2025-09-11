# Upstash Redis Setup Guide

## Step 1: Set up Upstash Redis

1. Go to your Vercel Dashboard
2. Navigate to your project
3. Go to "Storage" tab
4. Click "Browse Marketplace"
5. Find and install "Upstash Redis"
6. Choose the **Free Plan** (10,000 requests/day, 256MB storage)

## Step 2: Get Environment Variables

After installing Upstash Redis in Vercel:

1. Go to your project settings
2. Click on "Environment Variables"
3. You should see these automatically added:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Step 3: Local Development (Optional)

If you want to test locally:

1. Create a `.env.local` file in your project root
2. Add your Upstash Redis credentials:
```
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

## Step 4: Deploy

The app will automatically use Redis once deployed to Vercel with the environment variables set.

## What Changed

- Replaced file-based storage with Redis
- All schedule data now persists across function calls
- No more "No schedule template found" errors
- Data survives deployments (until you manually clear it)

## Free Tier Limits

- 10,000 requests per day
- 256MB storage
- Perfect for your personal scheduler app!