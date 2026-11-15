#!/bin/sh
set -e

# Detect DNS resolver from /etc/resolv.conf
RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
if [ -z "$RESOLVER" ]; then
    RESOLVER="127.0.0.11"
fi

echo "Configuring Nginx with resolver: ${RESOLVER}"
sed -i "s/__RESOLVER__/${RESOLVER}/g" /etc/nginx/conf.d/default.conf
