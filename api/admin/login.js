import { getAdminCredentials } from '../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;
    const ADMIN_CREDENTIALS = getAdminCredentials();
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: 'admin-session-token' // Simple token for demo
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}