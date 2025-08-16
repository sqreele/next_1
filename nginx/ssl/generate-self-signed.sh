#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${1:-}
ALT_NAMES=${2:-"$DOMAIN"}

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain> [alt_names_csv]" >&2
  exit 1
fi

cat > /tmp/openssl.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = $DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
EOF

IFS=',' read -ra NAMES <<< "$ALT_NAMES"
INDEX=1
for name in "${NAMES[@]}"; do
  echo "DNS.$INDEX = $name" >> /tmp/openssl.cnf
  INDEX=$((INDEX+1))
done

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem -config /tmp/openssl.cnf

rm -f /tmp/openssl.cnf

echo "Generated cert.pem and key.pem for $DOMAIN"