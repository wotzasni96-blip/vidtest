const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class VidGuardAPI {
  constructor() {
    this.apiKey = process.env.VIDGUARD_API_KEY;
    this.baseURL = process.env.VIDGUARD_BASE_URL || 'https://api.vidguard.to';
  }

  // Get upload server
  async getUploadServer() {
    try {
      const response = await axios.get(`${this.baseURL}/v1/upload/server`, {
        params: { key: this.apiKey }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get upload server: ${error.message}`);
    }
  }

  // Upload video to server
  async uploadVideo(filePath, folderId = null) {
    try {
      // Get upload server first
      const serverInfo = await this.getUploadServer();
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('key', this.apiKey);
      if (folderId) {
        formData.append('folder', folderId);
      }

      const response = await axios.post(serverInfo.url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  // Remote upload via URL
  async remoteUpload(url, folderId = null) {
    try {
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('url', url);
      if (folderId) {
        formData.append('folder', folderId);
      }

      const response = await axios.post(`${this.baseURL}/v1/remote/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to remote upload: ${error.message}`);
    }
  }

  // Get video info
  async getVideoInfo(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/video/info`, {
        params: { key: this.apiKey, id: videoId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  // Get remote upload status
  async getRemoteUploadStatus(remoteId) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/remote/get`, {
        params: { key: this.apiKey, id: remoteId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get remote upload status: ${error.message}`);
    }
  }

  // Rename video
  async renameVideo(videoId, newName) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/video/rename`, {
        params: { key: this.apiKey, id: videoId, name: newName }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to rename video: ${error.message}`);
    }
  }

  // Delete video
  async deleteVideo(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/video/delete`, {
        params: { key: this.apiKey, id: videoId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  // Get video list
  async getVideoList(folderId = null, offset = 0, limit = 50) {
    try {
      const params = { key: this.apiKey, offset, limit };
      if (folderId) {
        params.folder = folderId;
      }

      const response = await axios.get(`${this.baseURL}/v1/video/list`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get video list: ${error.message}`);
    }
  }

  // Create folder
  async createFolder(name, parentFolderId = null) {
    try {
      const params = { key: this.apiKey, name };
      if (parentFolderId) {
        params.folder = parentFolderId;
      }

      const response = await axios.get(`${this.baseURL}/v1/folder/new`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  // Get folder list
  async getFolderList(parentFolderId = null) {
    try {
      const params = { key: this.apiKey };
      if (parentFolderId) {
        params.folder = parentFolderId;
      }

      const response = await axios.get(`${this.baseURL}/v1/folder/list`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get folder list: ${error.message}`);
    }
  }
}

module.exports = new VidGuardAPI();
