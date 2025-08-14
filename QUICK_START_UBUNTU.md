# Quick Start Guide - Video Website on Ubuntu

This guide will help you set up the video website on a fresh Ubuntu installation in just a few steps.

## Prerequisites

- Fresh Ubuntu installation (20.04 LTS, 22.04 LTS, or newer)
- User with sudo privileges (not root)
- Internet connection
- Domain name (optional, for SSL)

## Step 1: Download the Project

```bash
# Clone or download the project files to your server
git clone <your-repo-url> video-website
cd video-website
```

## Step 2: Run the Ubuntu Setup Script

```bash
# Make the script executable
chmod +x setup-ubuntu.sh

# Run the setup script
./setup-ubuntu.sh
```

The setup script will automatically:
- ✅ Update system packages
- ✅ Install Node.js 20.x
- ✅ Install and configure PostgreSQL
- ✅ Install FFmpeg for video processing
- ✅ Install PM2 process manager
- ✅ Install and configure Nginx
- ✅ Set up firewall rules
- ✅ Create systemd service
- ✅ Create project directory structure
- ✅ Install project dependencies
- ✅ Initialize database schema

## Step 3: Configure Environment

```bash
# Navigate to the project directory
cd ~/video-website

# Copy the environment template
cp .env.example .env

# Edit the configuration
nano .env
```

Configure the following in your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=video_website
DB_USER=your_username
DB_PASSWORD=video_website_password

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

## Step 4: Complete Setup

```bash
# Run the completion script
./complete-setup.sh
```

This script will:
- ✅ Test the database connection
- ✅ Initialize the database schema
- ✅ Test the application startup
- ✅ Provide final instructions

## Step 5: Start the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Start the service
sudo systemctl start video-website

# Enable auto-start on boot
sudo systemctl enable video-website

# Check status
sudo systemctl status video-website
```

## Access Your Website

- **User Site**: http://your-server-ip:3000
- **Admin Panel**: http://your-server-ip:3000/admin
  - Username: `admin` (or as configured in .env)
  - Password: (as configured in .env)

## Optional: SSL Setup

If you have a domain name:

```bash
# Set up SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Ubuntu-Specific Features

### Snap Packages (Alternative)
If you prefer using snap packages:

```bash
# Install Node.js via snap (alternative)
sudo snap install node --classic

# Install PostgreSQL via snap (alternative)
sudo snap install postgresql
```

### Ubuntu Software Center
You can also install some packages through the Ubuntu Software Center:
- Nginx
- PostgreSQL
- FFmpeg

## Management Commands

### View Logs
```bash
# Application logs
sudo journalctl -u video-website -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -f
```

### Restart Services
```bash
# Restart application
sudo systemctl restart video-website

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Update Application
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart the service
sudo systemctl restart video-website
```

### System Updates
```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade

# Update Node.js (if installed via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Troubleshooting

### Check Service Status
```bash
sudo systemctl status video-website
sudo systemctl status nginx
sudo systemctl status postgresql
```

### Check Port Usage
```bash
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo ss -tlnp | grep :3000
```

### Check Database Connection
```bash
psql -h localhost -U your_username -d video_website
```

### View Application Logs
```bash
# Real-time logs
sudo journalctl -u video-website -f

# Recent logs
sudo journalctl -u video-website -n 50

# Logs since boot
sudo journalctl -u video-website -b
```

### Ubuntu-Specific Issues

#### AppArmor Issues
If you encounter AppArmor-related issues:

```bash
# Check AppArmor status
sudo aa-status

# Temporarily disable AppArmor for testing
sudo systemctl stop apparmor
```

#### Snap Confinement
If using snap packages and encountering permission issues:

```bash
# Check snap connections
snap connections node
snap connections postgresql
```

## Security Notes

1. **Change default passwords** in the `.env` file
2. **Use strong session secrets**
3. **Configure firewall** (already done by setup script)
4. **Keep Ubuntu updated** regularly: `sudo apt update && sudo apt upgrade`
5. **Use SSL** in production
6. **Monitor logs** for suspicious activity
7. **Enable automatic security updates**:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

## Ubuntu LTS Support

- **Ubuntu 20.04 LTS**: Supported until April 2025
- **Ubuntu 22.04 LTS**: Supported until April 2027
- **Ubuntu 24.04 LTS**: Supported until April 2029

For production deployments, it's recommended to use Ubuntu LTS versions.

## Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u video-website -f`
2. Verify configuration in `.env` file
3. Check service status: `sudo systemctl status video-website`
4. Review the main README.md for detailed documentation
5. Check Ubuntu-specific documentation: https://help.ubuntu.com/

---

🎉 **Congratulations!** Your video website is now running on Ubuntu!
