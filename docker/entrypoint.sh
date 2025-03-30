#!/bin/sh
nginx && uv run main.py --host 0.0.0.0 --port 8000 -p http://127.0.0.1:80 -f /app/openapi.json $@