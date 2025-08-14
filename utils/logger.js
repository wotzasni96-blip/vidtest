const winston = require('winston');
const pool = require('../config/database');

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'video-website' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Log user actions to database
const logUserAction = async (actionType, videoId = null, req) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || '';
    
    await pool.query(
      'INSERT INTO user_actions (action_type, video_id, user_agent, referrer) VALUES ($1, $2, $3, $4)',
      [actionType, videoId, userAgent, referrer]
    );
    
    logger.info('User action logged', {
      actionType,
      videoId,
      userAgent: userAgent.substring(0, 100), // Truncate for privacy
      referrer: referrer.substring(0, 100)
    });
  } catch (error) {
    logger.error('Error logging user action:', error);
  }
};

// Log video view
const logVideoView = async (videoId, req) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || '';
    
    await pool.query(
      'INSERT INTO video_views (video_id, user_agent, referrer) VALUES ($1, $2, $3)',
      [videoId, userAgent, referrer]
    );
    
    // Update video view count
    await pool.query(
      'UPDATE videos SET views = views + 1 WHERE id = $1',
      [videoId]
    );
    
    logger.info('Video view logged', {
      videoId,
      userAgent: userAgent.substring(0, 100),
      referrer: referrer.substring(0, 100)
    });
  } catch (error) {
    logger.error('Error logging video view:', error);
  }
};

module.exports = {
  logger,
  logUserAction,
  logVideoView
};
