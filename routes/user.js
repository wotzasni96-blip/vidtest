const express = require('express');
const router = express.Router();
const videoService = require('../services/video-service');
const { logUserAction, logVideoView } = require('../utils/logger');

// Home page
router.get('/', async (req, res) => {
  try {
    const [newVideos, mostViewed, statistics] = await Promise.all([
      videoService.getNewVideos(8),
      videoService.getMostViewedThisWeek(8),
      videoService.getStatistics()
    ]);

    await logUserAction('home_page_view', null, req);

    res.render('user/home', {
      newVideos,
      mostViewed,
      statistics
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Video listing page
router.get('/videos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const sortBy = req.query.sort || 'created_at';
    const sortOrder = req.query.order || 'DESC';

    const videos = await videoService.getVideos(page, 12, search, sortBy, sortOrder);
    const totalVideos = await videoService.getVideoCount(true);
    const totalPages = Math.ceil(totalVideos / 12);

    await logUserAction('video_list_view', null, req);

    res.render('user/videos', {
      videos,
      currentPage: page,
      totalPages,
      search,
      sortBy,
      sortOrder
    });
  } catch (error) {
    console.error('Error loading videos:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Video detail page
router.get('/video/:id', async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const video = await videoService.getVideoById(videoId);

    if (!video || !video.finished) {
      return res.status(404).render('error', { error: 'Video not found' });
    }

    await logVideoView(videoId, req);
    await logUserAction('video_view', videoId, req);

    res.render('user/video', { video });
  } catch (error) {
    console.error('Error loading video:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Videos by model
router.get('/model/:modelName', async (req, res) => {
  try {
    const modelName = decodeURIComponent(req.params.modelName);
    const page = parseInt(req.query.page) || 1;
    
    const videos = await videoService.getVideosByModel(modelName, page, 12);
    const totalVideos = await videoService.getVideoCount(true);
    const totalPages = Math.ceil(totalVideos / 12);

    await logUserAction('model_view', null, req);

    res.render('user/videos', {
      videos,
      currentPage: page,
      totalPages,
      filterType: 'model',
      filterValue: modelName
    });
  } catch (error) {
    console.error('Error loading model videos:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Videos by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const page = parseInt(req.query.page) || 1;
    
    const videos = await videoService.getVideosByTag(tag, page, 12);
    const totalVideos = await videoService.getVideoCount(true);
    const totalPages = Math.ceil(totalVideos / 12);

    await logUserAction('tag_view', null, req);

    res.render('user/videos', {
      videos,
      currentPage: page,
      totalPages,
      filterType: 'tag',
      filterValue: tag
    });
  } catch (error) {
    console.error('Error loading tag videos:', error);
    res.status(500).render('error', { error: 'Internal server error' });
  }
});

// Search API
router.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ videos: [] });
    }

    const videos = await videoService.getVideos(1, 10, q);
    res.json({ videos });
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get models API
router.get('/api/models', async (req, res) => {
  try {
    const models = await videoService.getAllModels();
    res.json({ models });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tags API
router.get('/api/tags', async (req, res) => {
  try {
    const tags = await videoService.getAllTags();
    res.json({ tags });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
