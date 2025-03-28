const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

// Import the httmcp module from the dist folder
const { OpenAPIMCP } = require('httmcp');

// Create MCP server
const server = new OpenAPIMCP({
  definition: 'https://ghfast.top/https://raw.githubusercontent.com/lloydzhou/openapiclient/refs/heads/main/examples/jinareader.json',
  name: "jinareader1",
  version: "1.0.0",
  instructions: "This is an petstore MCP server",
  publishServer: "http://nchan:80"
});

server.init().then(() => {
  console.log('Server initialized from OpenAPI definition');

  // Add MCP server to Express application
  app.use(server.prefix, server.router);

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});

// To run this server: node server.js