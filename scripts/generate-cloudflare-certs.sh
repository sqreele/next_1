#!/bin/bash

# Script to generate CloudFlare Origin CA certificates
# This helps resolve Error 525 (SSL Handshake Failed)

echo "CloudFlare Origin CA Certificate Setup"
echo "======================================"
echo ""
echo "To fix Error 525, you need to generate CloudFlare Origin CA certificates."
echo ""
echo "Steps to follow:"
echo "1. Log in to your CloudFlare dashboard"
echo "2. Go to SSL/TLS > Origin Server"
echo "3. Click 'Create Certificate'"
echo "4. Select the following options:"
echo "   - Private key type: RSA (2048)"
echo "   - Hostnames: pmcs.site, *.pmcs.site"
echo "   - Certificate validity: 15 years (or your preference)"
echo "5. Copy the Origin Certificate content and save it as: nginx/ssl/cert.pem"
echo "6. Copy the Private Key content and save it as: nginx/ssl/key.pem"
echo ""
echo "Alternatively, for testing purposes, you can generate a self-signed certificate:"
echo ""
read -p "Do you want to generate a self-signed certificate for testing? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Create SSL directory if it doesn't exist
    mkdir -p /workspace/nginx/ssl
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /workspace/nginx/ssl/key.pem \
        -out /workspace/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=pmcs.site"
    
    echo "Self-signed certificate generated successfully!"
    echo "Note: This is only for testing. For production, use CloudFlare Origin CA certificates."
else
    echo "Please follow the steps above to create CloudFlare Origin CA certificates."
fi

echo ""
echo "After creating certificates, ensure CloudFlare SSL/TLS encryption mode is set to:"
echo "- 'Full' (if using self-signed certificates)"
echo "- 'Full (strict)' (if using CloudFlare Origin CA certificates)"