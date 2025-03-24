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

## Command Line Interface

HTTMCP provides a CLI to quickly deploy OpenAPI services with Nchan MCP Transport:

```bash
# Basic usage
python -m httmcp -f openapi.json -p http://nchan:80

# Advanced usage with all options
python -m httmcp \
  --openapi-file openapi.json \
  --name "my-openapi-service" \
  --publish-server http://nchan:80 \
  --host 0.0.0.0 \
  --port 8080 \
```

CLI arguments:
- `-f, --openapi-file`: OpenAPI specification file path or URL (required)
- `-n, --name`: Name for the MCP server (default: derived from OpenAPI)
- `-p, --publish-server`: Nchan publish server URL (required)
- `-H, --host`: Host to bind the server (default: 0.0.0.0)
- `-P, --port`: Port to bind the server (default: 8000)