#!/usr/bin/env sh
set -e

HAR_FILE="${1:-/input/traffic.har}"
OUTPUT_FILE="${2:-/data/openapi.yaml}"

if [ ! -f "$HAR_FILE" ]; then
  echo "HAR não encontrado em $HAR_FILE" >&2
  exit 1
fi

mitmproxy2swagger -i "$HAR_FILE" -o "$OUTPUT_FILE"

echo "OpenAPI gerado em $OUTPUT_FILE"
