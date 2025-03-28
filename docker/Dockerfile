FROM ghcr.io/astral-sh/uv:python3.11-alpine

WORKDIR /app

# Install dependencies
COPY python/examples/requirements.txt .
RUN uv venv && uv pip install --no-cache-dir -r requirements.txt

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

# Expose the port the app runs on
EXPOSE 80
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]