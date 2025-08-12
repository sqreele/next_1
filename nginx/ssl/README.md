# Nginx SSL setup for Cloudflare (pmcs.site)

Use a Cloudflare Origin Certificate to avoid 525 errors and enable Full (strict) mode.

## Files expected by Nginx
- `cert.pem`: Origin certificate
- `key.pem`: Private key for the origin certificate
- Optional: `cloudflare_origin_pull_ca.pem` if you enable Authenticated Origin Pulls

These are mounted into the Nginx container at `/etc/nginx/ssl/` via `docker-compose.yml`.

## Option A: Cloudflare Origin Certificate (recommended)
1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create certificate
   - Key type: RSA
   - Hostnames: `pmcs.site`, `*.pmcs.site` (if you need subdomains)
2. Copy the generated files to this folder:
   - Certificate → save as `cert.pem`
   - Private key → save as `key.pem`
3. [Optional] Authenticated Origin Pulls
   - Download Cloudflare’s Origin Pulls CA from their docs and save as `cloudflare_origin_pull_ca.pem`
   - In `nginx/conf.d/pmcs.site.conf`, uncomment:
     - `ssl_client_certificate /etc/nginx/ssl/cloudflare_origin_pull_ca.pem;`
     - `ssl_verify_client on;`
4. In Cloudflare → SSL/TLS → Overview: set to Full (strict)
5. Ensure DNS records are proxied (orange cloud)
6. Reload Nginx container

```bash
# From project root
docker compose up -d nginx
# Or reload inside container
# docker exec -it nginx nginx -t && docker exec -it nginx nginx -s reload
```

## Option B: Temporary self-signed cert (for testing Full, not Strict)
Use only for quick diagnostics. Cloudflare mode must be "Full" (not Strict).

```bash
bash ./nginx/ssl/generate-self-signed.sh pmcs.site "pmcs.site,www.pmcs.site"
```

## Verify from origin directly (SNI)
Replace `ORIGIN_IP` with your server IP.

```bash
curl -Iv --resolve pmcs.site:443:ORIGIN_IP https://pmcs.site
openssl s_client -connect ORIGIN_IP:443 -servername pmcs.site -showcerts < /dev/null
```

## Firewall
Allow Cloudflare IP ranges to port 443 on your origin if you restrict inbound traffic. IP ranges: https://www.cloudflare.com/ips/