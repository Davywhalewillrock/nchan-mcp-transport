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
