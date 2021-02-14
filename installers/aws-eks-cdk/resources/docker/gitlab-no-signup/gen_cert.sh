#!/bin/bash
set -e; set -x

# https://www.digitalocean.com/community/tutorials/openssl-essentials-working-with-ssl-certificates-private-keys-and-csrs

HOST_DNS_NAME=gitlab.legend.com # TODO

mkdir -p $CONFIG_DIR/ssl
KEY_FILE=$CONFIG_DIR/ssl/self.key
CERT_FILE=$CONFIG_DIR/ssl/self.crt
DER_FILE=$CONFIG_DIR/ssl/self.der
TRUST_STORE=$CONFIG_DIR/ssl/truststore.jks

echo "Generating certs to $CONFIG_DIR/ssl ..."

# Generate cert
openssl req \
       -newkey rsa:2048 -nodes \
       -keyout $KEY_FILE \
       -x509 -days 365 \
       -out $CERT_FILE \
       -subj "/C=US/ST=NY/L=NY/O=XX/CN=$HOST_DNS_NAME"

# Convert cert
openssl x509 \
       -in $CERT_FILE \
       -outform der \
       -out $DER_FILE

# Print cert
# openssl x509 -text -noout -in $CERT_FILE