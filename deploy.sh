#!/bin/bash
# deploy.sh

echo "Starting frontend deployment..."

# Define paths
FRONTEND_DIR="/home/ubuntu/Pilo-frontend"
DOMAIN="www.pilo.life"
BUILD_DIR="$FRONTEND_DIR/dist"

# Create Nginx configuration for HTTP first
echo "Creating initial HTTP Nginx configuration..."
sudo tee /etc/nginx/nginx.conf > /dev/null << EOL
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # HTTP server
    server {
        listen 80;
        server_name $DOMAIN;

        # Root directory
        root $BUILD_DIR;
        index index.html;

        # Static file serving
        location / {
            try_files \$uri \$uri/ /index.html;
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }

        # Assets
        location /assets {
            expires 1y;
            add_header Cache-Control "public, no-transform";
        }

        # API proxy
        location /api/ {
            proxy_pass http://api.pilo.life/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host api.pilo.life;
            proxy_cache_bypass \$http_upgrade;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOL

# Build frontend
echo "Building frontend..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    echo "Creating production build..."
    npm run build
else
    echo "❌ Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid"
    sudo systemctl restart nginx
else
    echo "Nginx configuration is invalid"
    exit 1
fi

# Final checks
echo "Performing final checks..."

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
fi

echo "Testing HTTP endpoint..."
curl -I http://$DOMAIN/

echo "Deployment complete!"
echo "You can monitor logs with:"
echo "- Nginx access logs: sudo tail -f /var/log/nginx/access.log"
echo "- Nginx error logs: sudo tail -f /var/log/nginx/error.log"

# Show status
echo -e "\nService Status:"
sudo systemctl status nginx --no-pager

echo -e "\nIMPORTANT: Your site is now running on HTTP."
echo "To enable HTTPS:"
echo "1. Make sure port 80 is open in your security group"
echo "2. Run: sudo certbot --nginx -d $DOMAIN"
echo "3. Follow the prompts to configure HTTPS"