# Error 525 (SSL Handshake Failed) - Solution Guide

## Problem Description
Error 525 indicates that CloudFlare cannot establish an SSL connection with your origin server (pmcs.site). This is happening because the SSL certificates are missing from the nginx configuration.

## Root Cause
- The `/workspace/nginx/ssl/` directory is empty
- Nginx is configured to use SSL certificates at `/etc/nginx/ssl/cert.pem` and `/etc/nginx/ssl/key.pem`
- Without these certificates, nginx cannot handle HTTPS connections, causing CloudFlare to fail the SSL handshake

## Solution Options

### Option 1: CloudFlare Origin CA Certificate (Recommended)
1. Log in to your CloudFlare dashboard
2. Navigate to **SSL/TLS > Origin Server**
3. Click **Create Certificate**
4. Configure:
   - Private key type: RSA (2048)
   - Hostnames: `pmcs.site, *.pmcs.site`
   - Certificate validity: 15 years
5. Save the generated files:
   - Origin Certificate → `/workspace/nginx/ssl/cert.pem`
   - Private Key → `/workspace/nginx/ssl/key.pem`
6. Set CloudFlare SSL mode to **Full (strict)**

### Option 2: Let's Encrypt Certificate
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d pmcs.site -d www.pmcs.site

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/pmcs.site/fullchain.pem /workspace/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/pmcs.site/privkey.pem /workspace/nginx/ssl/key.pem
```

### Option 3: Self-Signed Certificate (Testing Only)
```bash
# Run the provided script
/workspace/scripts/generate-cloudflare-certs.sh
```

## CloudFlare SSL/TLS Settings
Ensure your CloudFlare SSL/TLS encryption mode matches your certificate type:
- **Flexible**: No SSL between CloudFlare and your server (NOT recommended)
- **Full**: Accepts any certificate including self-signed
- **Full (strict)**: Requires valid certificate (CloudFlare Origin CA or publicly trusted)

## Verification Steps
1. Check certificate files exist:
   ```bash
   ls -la /workspace/nginx/ssl/
   ```

2. Test nginx configuration:
   ```bash
   nginx -t
   ```

3. Restart nginx:
   ```bash
   docker-compose restart nginx
   ```

4. Verify SSL connection:
   ```bash
   openssl s_client -connect pmcs.site:443 -servername pmcs.site
   ```

## Additional Considerations
- Ensure firewall allows port 443
- Verify Docker volumes mount the SSL directory correctly
- Check nginx error logs for any SSL-related errors
- Confirm CloudFlare proxy is enabled for your domain

## Quick Fix Script
```bash
# Create SSL directory
mkdir -p /workspace/nginx/ssl

# Generate temporary self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /workspace/nginx/ssl/key.pem \
    -out /workspace/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=pmcs.site"

# Set appropriate permissions
chmod 644 /workspace/nginx/ssl/cert.pem
chmod 600 /workspace/nginx/ssl/key.pem
```

Remember: For production use, always use CloudFlare Origin CA or Let's Encrypt certificates!