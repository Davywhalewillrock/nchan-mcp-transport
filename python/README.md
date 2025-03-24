# HTTP MCP Transport for Nchan - Python SDK

This is an HTTP-based MCP (Machine Conversation Protocol) transport library designed for integration with Nchan.

## Installation

```bash
pip install httmcp
```

## Usage

```python
from httmcp import HTTMCP

# Create MCP server
mcp_server = HTTMCP(
    name="my-mcp",
    instructions="This is an MCP server",
    publish_server="http://localhost:8080"
)

# Add MCP server to FastAPI application
app = FastAPI()
app.include_router(mcp_server.router)
```

## OpenAPI Support

HTTMCP also supports creating MCP servers from OpenAPI specifications:

```python
from httmcp import OpenAPIMCP

# Create MCP server from OpenAPI specification
mcp_server = await OpenAPIMCP.from_openapi(
    definition="openapi.json",
    name="my-openapi-mcp",
    publish_server="http://localhost:8080"
)

# Add MCP server to FastAPI application
app = FastAPI()
app.include_router(mcp_server.router)
```

## One-Click GPTs Actions to MCP Deployment

HTTMCP provides a powerful CLI for instant deployment of GPTs Actions to MCP servers:

```bash
# Installation
pip install httmcp[cli]

# One-click deployment from GPTs Actions OpenAPI spec
python -m httmcp -f gpt_actions_openapi.yml -p http://nchan:80

# Complete deployment with custom configuration
python -m httmcp \
  --openapi-file gpt_actions_openapi.yml \
  --name "my-gpts-service" \
  --publish-server http://nchan:80 \
  --host 0.0.0.0 \
  --port 8080
```

CLI options:
- `-f, --openapi-file`: OpenAPI specification file path or URL (required)
- `-p, --publish-server`: Nchan publish server URL for MCP transport (required)
- `-n, --name`: Custom name for your MCP server (default: derived from OpenAPI)
- `-H, --host`: Host address to bind the server (default: 0.0.0.0)
- `-P, --port`: Local port number for accessing your deployed MCP service (default: 8000)