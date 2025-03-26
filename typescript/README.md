# HTTP MCP Transport for Nchan - TypeScript SDK

This is an HTTP-based MCP (Machine Conversation Protocol) transport library designed for integration with Nchan.

## Installation

```bash
npm install httmcp
# or
yarn add httmcp
```

## Usage

```typescript
import { HTTMCP } from 'httmcp';
import express from 'express';

// Create MCP server
const mcpServer = new HTTMCP({
  name: "my-mcp",
  instructions: "This is an MCP server",
  publishServer: "http://localhost:8080"
});

// Add MCP server to Express application
const app = express();
app.use(server.prefix, server.router);

app.listen(3000, () => {
  console.log('MCP server running on port 3000');
});
```

## OpenAPI Support

HTTMCP also supports creating MCP servers from OpenAPI specifications:

```typescript
import { OpenAPIMCP } from 'httmcp';
import express from 'express';

// Create MCP server from OpenAPI specification
const mcpServer = new OpenAPIMCP({
  definition: 'https://petstore3.swagger.io/api/v3/openapi.json', // URL or local file path
  name: 'petstore',
  version: '1.0.0',
  publishServer: 'http://localhost:8080'
});

// Initialize the server (async operation)
mcpServer.init().then(() => {
  console.log('Server initialized from OpenAPI definition');

  // Add MCP server to Express application
  const app = express();
  app.use(mcpServer.prefix, mcpServer.router);

  app.listen(3000, () => {
    console.log('OpenAPI MCP server running on port 3000');
  });
});

await mcpServer.init();
```

The OpenAPIMCP automatically converts your OpenAPI endpoints into MCP tools that can be used by AI assistants through the MCP protocol.