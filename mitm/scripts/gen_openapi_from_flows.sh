#!/usr/bin/env sh
set -e

FLOWS_FILE="${1:-/data/flows.mitm}"
OUTPUT_FILE="${2:-/data/openapi.yaml}"

if [ ! -f "$FLOWS_FILE" ]; then
  echo "Flows não encontrado em $FLOWS_FILE" >&2
  exit 1
fi

mitmproxy2swagger -i "$FLOWS_FILE" -o "$OUTPUT_FILE"

echo "OpenAPI gerado em $OUTPUT_FILE"
