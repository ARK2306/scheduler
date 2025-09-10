# Deployment Guide for Render.com

## 🚀 Deploy Your Scheduler App to Render.com

### Prerequisites
1. Create a [Render.com](https://render.com) account
2. Push your code to GitHub/GitLab repository
3. Make sure your code includes all the deployment changes

### Step 1: Prepare Your Repository

Make sure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Deploy to Render

1. **Log in to Render**
   - Go to [render.com](https://render.com)
   - Sign in with your GitHub account

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your scheduler repository

3. **Configure the Web Service**
   - **Name**: `scheduler-app` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   Click "Advanced" and add these environment variables:
   
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-app-name.onrender.com
   ```
   
   Replace `your-app-name` with your actual app name.

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Wait for the build to complete (5-10 minutes)

### Step 3: Update CORS Configuration

After deployment, you need to update the CORS configuration:

1. **Get your Render URL**
   - Your app will be available at: `https://your-app-name.onrender.com`

2. **Update Environment Variables**
   - Go to your service dashboard on Render
   - Navigate to "Environment"
   - Update `FRONTEND_URL` with your actual Render URL

### Step 4: Test Your Deployment

1. **Visit your app**: `https://your-app-name.onrender.com`

2. **Test key functionality**:
   - Admin login (admin/admin123)
   - Create schedule templates
   - Employee preference submission
   - Schedule generation

### Step 5: Custom Domain (Optional)

To use a custom domain:

1. **In Render Dashboard**:
   - Go to your service → "Settings" → "Custom Domains"
   - Add your domain name
   - Follow DNS configuration instructions

### 🔧 Troubleshooting

**Build Failures:**
- Check the build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**CORS Errors:**
- Make sure `FRONTEND_URL` environment variable is set correctly
- Check that your Render URL matches the CORS configuration

**API Errors:**
- Verify environment variables are set
- Check that all API endpoints are working
- Review server logs in Render dashboard

### 📝 Important Notes

1. **Free Tier Limitations**:
   - Apps sleep after 15 minutes of inactivity
   - Cold starts may take 30+ seconds
   - 750 hours per month limit

2. **Data Persistence**:
   - Files are stored locally and will persist between deploys
   - For production, consider using a database service

3. **Environment Variables**:
   - Never commit sensitive data to your repository
   - Use Render's environment variables for configuration

### 🎉 Your App is Live!

Your scheduler application is now deployed and accessible worldwide at:
`https://your-app-name.onrender.com`

**Admin Portal**: `https://your-app-name.onrender.com/admin`
**Employee Portal**: `https://your-app-name.onrender.com/employee`

Share the employee link with your team to start collecting shift preferences!