const pool = require('../config/database');
const vidguardAPI = require('./vidguard-api');
const { logUserAction } = require('../utils/logger');

class VideoService {
  // Get all finished videos with pagination
  async getVideos(page = 1, limit = 12, search = '', sortBy = 'created_at', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    let query = `
      SELECT * FROM videos 
      WHERE finished = true
    `;
    const params = [];

    if (search) {
      query += ` AND (
        title ILIKE $${params.length + 1} OR 
        model_name ILIKE $${params.length + 1} OR 
        tags::text ILIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get videos by model
  async getVideosByModel(modelName, page = 1, limit = 12) {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM videos 
       WHERE finished = true AND model_name ILIKE $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [modelName, limit, offset]
    );
    return result.rows;
  }

  // Get videos by tag
  async getVideosByTag(tag, page = 1, limit = 12) {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM videos 
       WHERE finished = true AND $1 = ANY(tags) 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [tag, limit, offset]
    );
    return result.rows;
  }

  // Get video by ID
  async getVideoById(id) {
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Get new videos (last 7 days)
  async getNewVideos(limit = 8) {
    const result = await pool.query(
      `SELECT * FROM videos 
       WHERE finished = true AND created_at >= NOW() - INTERVAL '7 days' 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Get most viewed videos this week
  async getMostViewedThisWeek(limit = 8) {
    const result = await pool.query(
      `SELECT v.*, COUNT(vv.id) as weekly_views 
       FROM videos v 
       LEFT JOIN video_views vv ON v.id = vv.video_id 
       AND vv.created_at >= NOW() - INTERVAL '7 days'
       WHERE v.finished = true 
       GROUP BY v.id 
       ORDER BY weekly_views DESC, v.views DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Get all unfinished videos (admin only)
  async getUnfinishedVideos() {
    const result = await pool.query(
      'SELECT * FROM videos WHERE finished = false ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Create new video
  async createVideo(videoData) {
    const { title, description, model_name, tags, embed_code, video_id, thumbnail_url, finished = false } = videoData;
    
    const result = await pool.query(
      `INSERT INTO videos (title, description, model_name, tags, embed_code, video_id, thumbnail_url, finished) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description, model_name, tags, embed_code, video_id, thumbnail_url, finished]
    );
    
    return result.rows[0];
  }

  // Update video
  async updateVideo(id, videoData) {
    const { title, description, model_name, tags, embed_code, video_id, thumbnail_url, finished } = videoData;
    
    const result = await pool.query(
      `UPDATE videos 
       SET title = $1, description = $2, model_name = $3, tags = $4, 
           embed_code = $5, video_id = $6, thumbnail_url = $7, finished = $8, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [title, description, model_name, tags, embed_code, video_id, thumbnail_url, finished, id]
    );
    
    return result.rows[0];
  }

  // Delete video
  async deleteVideo(id) {
    // First delete from VidGuard if video_id exists
    const video = await this.getVideoById(id);
    if (video && video.video_id) {
      try {
        await vidguardAPI.deleteVideo(video.video_id);
      } catch (error) {
        console.error('Failed to delete from VidGuard:', error);
      }
    }

    const result = await pool.query('DELETE FROM videos WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // Get all models
  async getAllModels() {
    const result = await pool.query(
      'SELECT DISTINCT model_name FROM videos WHERE finished = true AND model_name IS NOT NULL ORDER BY model_name'
    );
    return result.rows.map(row => row.model_name);
  }

  // Get all tags
  async getAllTags() {
    const result = await pool.query(
      'SELECT DISTINCT unnest(tags) as tag FROM videos WHERE finished = true AND tags IS NOT NULL ORDER BY tag'
    );
    return result.rows.map(row => row.tag);
  }

  // Get video count
  async getVideoCount(finished = true) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM videos WHERE finished = $1',
      [finished]
    );
    return parseInt(result.rows[0].count);
  }

  // Get total views
  async getTotalViews() {
    const result = await pool.query('SELECT SUM(views) as total_views FROM videos WHERE finished = true');
    return parseInt(result.rows[0].total_views) || 0;
  }

  // Get statistics
  async getStatistics() {
    const [totalVideos, totalViews, newVideos, mostViewed] = await Promise.all([
      this.getVideoCount(true),
      this.getTotalViews(),
      this.getNewVideos(5),
      this.getMostViewedThisWeek(5)
    ]);

    return {
      totalVideos,
      totalViews,
      newVideos,
      mostViewed
    };
  }

  // Process remote upload
  async processRemoteUpload(url, title, description, model_name, tags, finished = false) {
    try {
      // Start remote upload
      const uploadResult = await vidguardAPI.remoteUpload(url);
      
      // Create video record with pending status
      const videoData = {
        title: title || 'Uploading...',
        description: description || '',
        model_name: model_name || '',
        tags: tags || [],
        embed_code: '',
        video_id: uploadResult.id,
        thumbnail_url: '',
        finished: false
      };

      const video = await this.createVideo(videoData);
      return video;
    } catch (error) {
      throw new Error(`Failed to process remote upload: ${error.message}`);
    }
  }

  // Check and update remote upload status
  async checkRemoteUploadStatus(videoId) {
    const video = await this.getVideoById(videoId);
    if (!video || !video.video_id) {
      throw new Error('Video not found or no remote upload ID');
    }

    try {
      const status = await vidguardAPI.getRemoteUploadStatus(video.video_id);
      
      if (status.status === 'finished') {
        // Get video info from VidGuard
        const videoInfo = await vidguardAPI.getVideoInfo(status.video_id);
        
        // Update video with embed code and thumbnail
        const embedCode = `<div id="${status.video_id}" domain="listeamed.net" width="800" height="600"></div><script src="data:text/javascript;base64,dmFyIHA9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoInNjcmlwdCIpWzBdLGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgic2NyaXB0IiksZD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCJkaXZbZG9tYWluXSIpLmdldEF0dHJpYnV0ZSgiZG9tYWluIik7ZS5zcmM9Ii8vIitkKyIvYXNzZXRzL2pzL2xvYWQuanMiLHAuYWZ0ZXIoZSk7"></script>`;
        
        await this.updateVideo(videoId, {
          ...video,
          embed_code: embedCode,
          thumbnail_url: videoInfo.thumbnail || '',
          video_id: status.video_id
        });
      }
      
      return status;
    } catch (error) {
      throw new Error(`Failed to check remote upload status: ${error.message}`);
    }
  }
}

module.exports = new VideoService();
