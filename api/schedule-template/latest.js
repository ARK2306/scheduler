import { getScheduleTemplates, getCurrentScheduleId } from '../_storage.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const scheduleTemplates = getScheduleTemplates();
    const currentScheduleId = getCurrentScheduleId();
    
    if (!currentScheduleId || !scheduleTemplates.has(currentScheduleId)) {
      // Return 200 with null data instead of 404 to indicate no template available
      return res.status(200).json({ 
        success: false,
        template: null,
        message: 'No schedule template found' 
      });
    }

    const template = scheduleTemplates.get(currentScheduleId);
    return res.status(200).json({
      success: true,
      template,
      ...template
    });
  } catch (error) {
    console.error('Get latest schedule template error:', error);
    return res.status(500).json({ error: 'Failed to get latest schedule template' });
  }
}