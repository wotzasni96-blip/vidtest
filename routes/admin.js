const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin, adminLogin, adminLogout } = require('../middleware/auth');
const videoService = require('../services/video-service');
const vidguardAPI = require('../services/vidguard-api');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 1000000000 // 1GB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

// Admin login handler
router.post('/login', adminLogin);

// Admin logout
router.get('/logout', adminLogout);

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [unfinishedVideos, statistics] = await Promise.all([
      videoService.getUnfinishedVideos(),
      videoService.getStatistics()
    ]);

    res.render('admin/dashboard', {
      unfinishedVideos,
      statistics
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Video management page
router.get('/videos', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const videos = await videoService.getVideos(page, 20, '', 'created_at', 'DESC');
    const totalVideos = await videoService.getVideoCount();
    const totalPages = Math.ceil(totalVideos / 20);

    res.render('admin/videos', {
      videos,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Error loading admin videos:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Add video page
router.get('/videos/add', requireAdmin, (req, res) => {
  res.render('admin/add-video');
});

// Add single video
router.post('/videos/add', requireAdmin, async (req, res) => {
  try {
    const { url, title, description, model_name, tags } = req.body;
    
    if (!url) {
      return res.render('admin/add-video', { error: 'Video URL is required' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Start remote upload
    const video = await videoService.processRemoteUpload(
      url, 
      title || 'Uploading...', 
      description || '', 
      model_name || '', 
      tagArray, 
      true // finished = true for single upload
    );

    res.redirect('/admin/videos');
  } catch (error) {
    console.error('Error adding video:', error);
    res.render('admin/add-video', { error: error.message });
  }
});

// Mass upload page
router.get('/videos/mass-upload', requireAdmin, (req, res) => {
  res.render('admin/mass-upload');
});

// Mass upload handler
router.post('/videos/mass-upload', requireAdmin, upload.array('videos'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.render('admin/mass-upload', { error: 'No files uploaded' });
    }

    const uploadedVideos = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Upload to VidGuard
        const uploadResult = await vidguardAPI.uploadVideo(file.path);
        
        // Create video record
        const videoData = {
          title: path.parse(file.originalname).name,
          description: '',
          model_name: '',
          tags: [],
          embed_code: '',
          video_id: uploadResult.id,
          thumbnail_url: '',
          finished: false // unfinished by default for mass upload
        };

        const video = await videoService.createVideo(videoData);
        uploadedVideos.push(video);

        // Clean up uploaded file
        fs.unlinkSync(file.path);
      } catch (error) {
        errors.push(`${file.originalname}: ${error.message}`);
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.render('admin/mass-upload', {
      success: `Successfully uploaded ${uploadedVideos.length} videos`,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Error in mass upload:', error);
    res.render('admin/mass-upload', { error: error.message });
  }
});

// Edit video page
router.get('/videos/edit/:id', requireAdmin, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const video = await videoService.getVideoById(videoId);

    if (!video) {
      return res.status(404).render('error', { error: 'Video not found' });
    }

    res.render('admin/edit-video', { video });
  } catch (error) {
    console.error('Error loading edit video:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Update video
router.post('/videos/edit/:id', requireAdmin, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const { title, description, model_name, tags, finished } = req.body;
    
    const video = await videoService.getVideoById(videoId);
    if (!video) {
      return res.status(404).render('error', { error: 'Video not found' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const updatedVideo = await videoService.updateVideo(videoId, {
      ...video,
      title,
      description,
      model_name,
      tags: tagArray,
      finished: finished === 'true'
    });

    res.redirect('/admin/videos');
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Delete video
router.post('/videos/delete/:id', requireAdmin, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    await videoService.deleteVideo(videoId);
    res.redirect('/admin/videos');
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check remote upload status
router.get('/api/upload-status/:id', requireAdmin, async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const status = await videoService.checkRemoteUploadStatus(videoId);
    res.json(status);
  } catch (error) {
    console.error('Error checking upload status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Statistics page
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const pool = require('../config/database');
    
    // Get user action statistics
    const actionStats = await pool.query(`
      SELECT action_type, COUNT(*) as count 
      FROM user_actions 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action_type 
      ORDER BY count DESC
    `);

    // Get daily views for the last 30 days
    const dailyViews = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as views
      FROM video_views 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get top videos by views
    const topVideos = await pool.query(`
      SELECT title, views 
      FROM videos 
      WHERE finished = true 
      ORDER BY views DESC 
      LIMIT 10
    `);

    res.render('admin/statistics', {
      actionStats: actionStats.rows,
      dailyViews: dailyViews.rows,
      topVideos: topVideos.rows
    });
  } catch (error) {
    console.error('Error loading statistics:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

module.exports = router;
