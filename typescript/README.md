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