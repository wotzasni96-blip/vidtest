#!/bin/bash

# Video Website Setup Script for Debian Trixie
# This script will set up a complete environment for the video website

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Function to check if running on Debian
check_debian() {
    if ! grep -q "Debian" /etc/os-release; then
        print_error "This script is designed for Debian. Please run on a Debian system."
        exit 1
    fi
    
    DEBIAN_VERSION=$(grep "VERSION_CODENAME" /etc/os-release | cut -d= -f2)
    if [[ "$DEBIAN_VERSION" != "trixie" ]]; then
        print_warning "This script is designed for Debian Trixie. You are running Debian $DEBIAN_VERSION"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    print_success "System updated successfully"
}

# Function to install essential packages
install_essentials() {
    print_status "Installing essential packages..."
    sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    print_success "Essential packages installed"
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js 20.x..."
    
    # Remove any existing Node.js installations
    sudo apt remove -y nodejs npm 2>/dev/null || true
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    
    # Install Node.js
    sudo apt install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"
}

# Function to install PostgreSQL
install_postgresql() {
    print_status "Installing PostgreSQL..."
    
    # Install PostgreSQL
    sudo apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    print_success "PostgreSQL installed and started"
}

# Function to setup PostgreSQL database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Get current user
    CURRENT_USER=$(whoami)
    
    # Create database user and database
    sudo -u postgres psql << EOF
CREATE USER $CURRENT_USER WITH PASSWORD 'video_website_password';
CREATE DATABASE video_website OWNER $CURRENT_USER;
GRANT ALL PRIVILEGES ON DATABASE video_website TO $CURRENT_USER;
\q
EOF
    
    print_success "Database 'video_website' created with user '$CURRENT_USER'"
    print_warning "Database password is 'video_website_password'. Please change this in production!"
}

# Function to install FFmpeg
install_ffmpeg() {
    print_status "Installing FFmpeg..."
    
    # Install FFmpeg
    sudo apt install -y ffmpeg
    
    # Verify installation
    FFMPEG_VERSION=$(ffmpeg -version | head -n1 | cut -d' ' -f3)
    print_success "FFmpeg $FFMPEG_VERSION installed"
}

# Function to install PM2 (for production)
install_pm2() {
    print_status "Installing PM2 process manager..."
    sudo npm install -g pm2
    print_success "PM2 installed globally"
}

# Function to install Nginx
install_nginx() {
    print_status "Installing Nginx..."
    sudo apt install -y nginx
    
    # Start and enable Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "Nginx installed and started"
}

# Function to create project directory
create_project_directory() {
    print_status "Creating project directory..."
    
    PROJECT_DIR="$HOME/video-website"
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    print_success "Project directory created at $PROJECT_DIR"
}

# Function to setup project files
setup_project_files() {
    print_status "Setting up project files..."
    
    # Create necessary directories
    mkdir -p {config,scripts,services,middleware,routes,utils,views/{layouts,user,admin},public/{css,js,images},logs,uploads}
    
    # Create .env file from example
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        print_success ".env file created from template"
    else
        print_warning ".env.example not found. Please create .env file manually."
    fi
    
    print_success "Project structure created"
}

# Function to install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    if [[ -f "package.json" ]]; then
        npm install
        print_success "Project dependencies installed"
    else
        print_error "package.json not found. Please ensure you're in the correct project directory."
        exit 1
    fi
}

# Function to initialize database
initialize_database() {
    print_status "Initializing database schema..."
    
    if [[ -f "scripts/init-db.js" ]]; then
        npm run init-db
        print_success "Database schema initialized"
    else
        print_error "Database initialization script not found."
        exit 1
    fi
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    # Install ufw if not present
    sudo apt install -y ufw
    
    # Configure firewall
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp  # For development
    
    print_success "Firewall configured (SSH, HTTP, HTTPS, and port 3000 allowed)"
}

# Function to create systemd service (for production)
create_systemd_service() {
    print_status "Creating systemd service for production..."
    
    SERVICE_FILE="/etc/systemd/system/video-website.service"
    
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Video Website Node.js Application
After=network.target postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable video-website
    
    print_success "Systemd service created and enabled"
}

# Function to setup Nginx configuration
setup_nginx_config() {
    print_status "Setting up Nginx configuration..."
    
    NGINX_CONFIG="/etc/nginx/sites-available/video-website"
    
    sudo tee "$NGINX_CONFIG" > /dev/null << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /static/ {
        alias $PROJECT_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable the site
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_success "Nginx configuration created and enabled"
}

# Function to setup SSL with Certbot
setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    # Install Certbot
    sudo apt install -y certbot python3-certbot-nginx
    
    print_warning "SSL certificate setup requires a domain name."
    print_warning "To set up SSL, run: sudo certbot --nginx -d yourdomain.com"
    print_warning "For automatic renewal, the certbot timer is already enabled."
}

# Function to create setup completion script
create_completion_script() {
    print_status "Creating setup completion script..."
    
    cat > "$PROJECT_DIR/complete-setup.sh" << 'EOF'
#!/bin/bash

# Complete Setup Script for Video Website
# Run this after the initial setup to configure your application

set -e

echo "=== Video Website Setup Completion ==="
echo "This script will help you complete the setup process."

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    echo "Error: .env file not found. Please create it from .env.example"
    exit 1
fi

echo ""
echo "Please configure the following in your .env file:"
echo "1. Database credentials"
echo "2. VidGuard API key"
echo "3. Admin username and password"
echo "4. Session secret"
echo ""

read -p "Have you configured the .env file? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please configure .env file and run this script again."
    exit 1
fi

# Initialize database
echo "Initializing database..."
npm run init-db

# Test the application
echo "Testing the application..."
npm start &
APP_PID=$!

# Wait for app to start
sleep 5

# Check if app is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is running successfully!"
    echo "🌐 User site: http://localhost:3000"
    echo "🔧 Admin panel: http://localhost:3000/admin"
else
    echo "❌ Application failed to start. Check the logs."
fi

# Stop the test instance
kill $APP_PID 2>/dev/null || true

echo ""
echo "=== Setup Complete! ==="
echo "To start the application:"
echo "  Development: npm run dev"
echo "  Production:  sudo systemctl start video-website"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u video-website -f"
echo ""
echo "To update the application:"
echo "  git pull"
echo "  npm install"
echo "  sudo systemctl restart video-website"
EOF
    
    chmod +x "$PROJECT_DIR/complete-setup.sh"
    print_success "Setup completion script created"
}

# Function to display final instructions
display_final_instructions() {
    echo ""
    echo "=========================================="
    echo "🎉 DEBIAN SETUP COMPLETE! 🎉"
    echo "=========================================="
    echo ""
    echo "✅ System packages updated"
    echo "✅ Node.js 20.x installed"
    echo "✅ PostgreSQL installed and configured"
    echo "✅ FFmpeg installed"
    echo "✅ PM2 installed"
    echo "✅ Nginx installed and configured"
    echo "✅ Firewall configured"
    echo "✅ Systemd service created"
    echo "✅ Project structure created"
    echo ""
    echo "📁 Project location: $PROJECT_DIR"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Navigate to the project directory:"
    echo "   cd $PROJECT_DIR"
    echo ""
    echo "2. Configure your .env file:"
    echo "   cp .env.example .env"
    echo "   nano .env"
    echo ""
    echo "3. Run the completion script:"
    echo "   ./complete-setup.sh"
    echo ""
    echo "🌐 Once configured, your site will be available at:"
    echo "   User site: http://localhost:3000"
    echo "   Admin panel: http://localhost:3000/admin"
    echo ""
    echo "🔒 For production with SSL:"
    echo "   sudo certbot --nginx -d yourdomain.com"
    echo ""
    echo "📚 For more information, see README.md"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "🚀 Video Website Debian Setup Script"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_root
    check_debian
    
    # Confirm before proceeding
    echo "This script will install and configure:"
    echo "- Node.js 20.x"
    echo "- PostgreSQL database"
    echo "- FFmpeg"
    echo "- PM2 process manager"
    echo "- Nginx web server"
    echo "- Firewall configuration"
    echo "- Systemd service"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Execute setup steps
    update_system
    install_essentials
    install_nodejs
    install_postgresql
    setup_database
    install_ffmpeg
    install_pm2
    install_nginx
    create_project_directory
    setup_project_files
    install_dependencies
    initialize_database
    setup_firewall
    create_systemd_service
    setup_nginx_config
    setup_ssl
    create_completion_script
    
    # Display final instructions
    display_final_instructions
}

# Run main function
main "$@"
