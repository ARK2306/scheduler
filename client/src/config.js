// API Configuration
const config = {
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? '' // For Vercel deployment, API routes are on the same domain
    : 'http://localhost:3001'
};

export default config;