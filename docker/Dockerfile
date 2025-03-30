FROM ghcr.io/astral-sh/uv:python3.11-alpine

WORKDIR /app

# Install dependencies
RUN uv venv && uv tool --no-cache install httmcp

# Install the application
RUN apk add --no-cache --virtual .run-deps bash openssl nginx nginx-mod-http-nchan

# Configure Nginx
# prepend include modules/*.conf; to nginx.conf
RUN mkdir -p '/etc/nginx/toplevel.conf.d' \
   && mkdir -p '/etc/nginx/dhparam' \
   && mkdir -p '/etc/nginx/certs' \
   && mkdir -p '/usr/share/nginx/html/errors' \
   && mkdir -p '/etc/nginx/conf.d'

# copy the nginx configuration
COPY docker/default.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint.sh /

COPY python/examples/requirements.txt /app/requirements.txt
RUN uv pip install --no-cache-dir -r /app/requirements.txt
COPY python/httmcp/__main__.py /app/main.py
COPY docker/feishu_group_summary.json /app/openapi.json

# Expose the port the app runs on
EXPOSE 80
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
