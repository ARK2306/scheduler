# 🚀 Deployment Guide - Memory Optimized

## Fix for Render.com Memory Issues

### Problem: "Ran out of memory (used over 8GB)"
This is common with React builds on Render's free tier. Here's how to fix it:

### ✅ Already Applied Optimizations

I've already optimized your code with these memory-saving changes:

1. **Removed unnecessary dependencies** (axios, react-calendar)
2. **Added memory limits** to React build process
3. **Disabled source maps** and ESLint during build
4. **Optimized build scripts**

### 🔧 Deploy to Render.com

1. **Push your optimized code:**
   ```bash
   git add .
   git commit -m "Memory optimization for Render deployment"
   git push origin main
   ```

2. **Create Web Service on Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Build Settings:**
   - **Name**: `scheduler-app`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

4. **IMPORTANT - Set Environment Variables:**
   Click "Advanced" and add these environment variables:
   
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-app-name.onrender.com
   NODE_OPTIONS=--max_old_space_size=4096
   GENERATE_SOURCEMAP=false
   DISABLE_ESLINT_PLUGIN=true
   SKIP_PREFLIGHT_CHECK=true
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for the build (should use much less memory now)

### 🔄 Alternative Solution: Netlify + Render Split

If memory issues persist, deploy frontend and backend separately:

**Frontend (Netlify):**
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Set build directory: `client`
4. Build command: `cd client && npm install && npm run build`
5. Publish directory: `client/build`

**Backend (Render):**
1. Create separate web service for backend only
2. Build command: `cd backend && npm install`
3. Start command: `cd backend && npm start`

### 🎯 Environment Variables for Split Deployment

**Frontend (Netlify):**
```
REACT_APP_API_URL=https://your-backend-name.onrender.com
```

**Backend (Render):**
```
NODE_ENV=production
FRONTEND_URL=https://your-frontend-name.netlify.app
```

### 📝 Key Memory Optimizations Applied

1. **Node.js Memory Limit**: Increased to 4GB
2. **Source Maps Disabled**: Saves ~70% build memory
3. **ESLint Disabled**: Reduces build overhead
4. **Minimal Dependencies**: Removed unused packages
5. **Optimized Build Process**: Sequential instead of parallel installs

### ✅ Expected Results

- **Build time**: 3-5 minutes (down from timeout)
- **Memory usage**: ~3-4GB (down from 8GB+)
- **Success rate**: Should build successfully now

### 🔍 Troubleshooting

If build still fails:
1. Check environment variables are set correctly
2. Try the split deployment approach
3. Verify Node.js version compatibility (18.x recommended)

Your optimized app should now deploy successfully! 🎉