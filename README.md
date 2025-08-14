# VideoHub - Video Website

A complete Node.js video website with admin and user views, featuring video upload, management, and viewing capabilities.

## Features

### User View
- Watch videos uploaded by admin
- View model names, tags, and view counts
- Search videos by title, model, or tags
- Sort videos by various criteria
- Click on models and tags to filter videos
- Home page with new videos and most viewed this week
- Responsive design with modern UI

### Admin View
- Add videos by URL (single upload)
- Mass upload multiple video files
- Edit all video properties
- Mark videos as finished/unfinished
- View unfinished videos for completion
- Comprehensive statistics and analytics
- Secure admin authentication

### Technical Features
- PostgreSQL database
- VidGuard API integration for video hosting
- User action logging (no IP logging)
- Admin action statistics
- Rate limiting and security measures
- Responsive Bootstrap UI
- EJS templating engine

## Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- Debian Trixie (or any Linux distribution)
- VidGuard API key

## Installation

### 1. System Setup (Debian Trixie)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install FFmpeg (for video processing)
sudo apt install ffmpeg -y

# Install build tools (for native dependencies)
sudo apt install build-essential -y
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE video_website;
CREATE USER video_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE video_website TO video_user;
\q
```

### 3. Project Setup

```bash
# Clone or download the project
cd /path/to/project

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit environment variables
nano .env
```

### 4. Environment Configuration

Edit the `.env` file with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=video_website
DB_USER=video_user
DB_PASSWORD=your_secure_password

# Server Configuration
PORT=3000
SESSION_SECRET=your_very_secure_session_secret_here

# VidGuard API Configuration
VIDGUARD_API_KEY=your_vidguard_api_key_here
VIDGUARD_BASE_URL=https://api.vidguard.to

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=1000000000
```

### 5. Database Initialization

```bash
# Initialize database tables
npm run init-db
```

### 6. Create Required Directories

```bash
# Create upload and logs directories
mkdir uploads
mkdir logs
```

### 7. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Usage

### Accessing the Application

- **User Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Admin Login**: Use credentials from `.env` file

### Admin Workflow

1. **Login to Admin Panel**
   - Navigate to `/admin`
   - Use credentials from `.env` file

2. **Add Videos**
   - **Single Upload**: Add video by URL with immediate processing
   - **Mass Upload**: Upload multiple files for batch processing

3. **Manage Videos**
   - Edit video details (title, description, model, tags)
   - Mark videos as finished/unfinished
   - Delete videos if needed

4. **Monitor Statistics**
   - View user activity statistics
   - Track video views and performance
   - Monitor upload status

### User Experience

1. **Browse Videos**
   - Home page shows new and trending videos
   - Use search functionality
   - Filter by models or tags

2. **Watch Videos**
   - Click on video thumbnails to watch
   - View video details and statistics
   - Navigate through related content

## API Integration

The application integrates with VidGuard API for video hosting:

- **Remote Upload**: Upload videos via URL
- **File Upload**: Direct file upload to VidGuard servers
- **Video Management**: Rename, delete, and manage videos
- **Embed Code Generation**: Automatic embed code creation

## Security Features

- **Rate Limiting**: Prevents abuse
- **Session Security**: Secure session management
- **Input Validation**: Sanitized user inputs
- **CORS Protection**: Cross-origin request protection
- **Helmet Security**: Security headers
- **No IP Logging**: Privacy-focused logging

## File Structure

```
video-website/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── user.js              # User routes
│   └── admin.js             # Admin routes
├── services/
│   ├── video-service.js     # Video business logic
│   └── vidguard-api.js      # VidGuard API integration
├── utils/
│   └── logger.js            # Logging utilities
├── views/
│   ├── layouts/
│   │   ├── main.ejs         # User layout
│   │   └── admin.ejs        # Admin layout
│   ├── user/
│   │   ├── home.ejs         # User home page
│   │   ├── videos.ejs       # Video listing
│   │   └── video.ejs        # Individual video page
│   ├── admin/
│   │   ├── login.ejs        # Admin login
│   │   ├── dashboard.ejs    # Admin dashboard
│   │   ├── videos.ejs       # Video management
│   │   ├── add-video.ejs    # Add video form
│   │   ├── edit-video.ejs   # Edit video form
│   │   ├── mass-upload.ejs  # Mass upload form
│   │   └── statistics.ejs   # Statistics page
│   └── error.ejs            # Error page
├── scripts/
│   └── init-db.js           # Database initialization
├── uploads/                 # Upload directory
├── logs/                    # Log files
├── server.js                # Main application file
├── package.json             # Dependencies
├── env.example              # Environment template
└── README.md                # This file
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials in `.env`
   - Ensure database exists: `sudo -u postgres psql -l`

2. **VidGuard API Errors**
   - Verify API key is correct
   - Check API key permissions
   - Ensure network connectivity

3. **Upload Failures**
   - Check file size limits
   - Verify file formats are supported
   - Ensure upload directory has write permissions

4. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process: `sudo lsof -ti:3000 | xargs kill -9`

### Logs

Check application logs in the `logs/` directory:
- `combined.log`: All application logs
- `error.log`: Error logs only

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "video-website"

# Enable startup script
pm2 startup
pm2 save
```

### Using Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the troubleshooting section
- Review the logs for error details
- Ensure all prerequisites are met
- Verify environment configuration

## Changelog

### Version 1.0.0
- Initial release
- Complete user and admin functionality
- VidGuard API integration
- PostgreSQL database
- Responsive UI design
