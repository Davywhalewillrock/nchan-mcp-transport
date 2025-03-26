const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

// Import the httmcp module from the dist folder
const { OpenAPIMCP } = require('httmcp');

// Create MCP server
const server = new OpenAPIMCP({
  definition: 'https://petstore3.swagger.io/api/v3/openapi.json',
  name: "petstore",
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