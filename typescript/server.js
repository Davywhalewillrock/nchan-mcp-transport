const express = require('express');
const app = express();
const z = require('zod');

const port = process.env.PORT || 3000;

// Import the httmcp module from the dist folder
const { HTTMCP } = require('httmcp');

// Create MCP server
const server = new HTTMCP({
  name: "testadd",
  instructions: "This is an MCP server",
  publishServer: "http://nchan:80"
});

// Register a simple addition tool
server.tool('add',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }]
  })
);

// Add MCP server to Express application
app.use(server.prefix, server.router);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// To run this server: node server.js