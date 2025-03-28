import { OpenAPIMCP } from '../index';
import express from 'express';
import { OpenAPIClientAxios } from 'openapi-client-axios';

// @ts-ignore
import fetch from 'node-fetch';

// Create global.fetch compatible environment, as node-fetch and native fetch may conflict
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

describe('OpenAPIMCP Tests', () => {
  let server: OpenAPIMCP;
  let app: express.Application;
  let port: number;
  let server_instance: any;
  
  beforeAll(async () => {
    // Create Express application
    app = express();
    port = 3031;
    
    // Create HTTMCP instance
    server = new OpenAPIMCP({
      definition: 'https://petstore3.swagger.io/api/v3/openapi.json',
      name: 'petstore',
      version: '1.0.0',
      publishServer: 'http://nchan:80'
    });
    await server.init();
  
    // Register HTTMCP route
    app.use(server.prefix, server.router);

    // Start the server
    return new Promise<void>((resolve) => {
      server_instance = app.listen(port, () => {
        console.log(`Test server listening on port ${port}`);
        resolve();
      });
    });
  });

  test('openapi client', async () => {
    const api = new OpenAPIClientAxios({
      definition: 'https://ghfast.top/https://raw.githubusercontent.com/lloydzhou/openapiclient/refs/heads/main/examples/jinareader.json'
    });
    const client = await api.init();
    const response = await client.ReadUrlContent("https://github.com/ConechoAI/nchan-mcp-transport");
    expect(response).toBeDefined();
    // console.log("response", response);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  })

  test('Server should initialize correctly', () => {
    expect(server).toBeDefined();
  });
  
  test('Server should have tools registered', async () => {
    // Mock tool list request
    const response = await fetch(`http://localhost:${port}/mcp/${server.name}/tools/list`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-MCP-Session-ID': 'test-session'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
        params: {}
      })
    });
    
    const data = await response.json();
    // console.log("tools response", data);
    expect(data.result).toBeDefined();
    expect(data.result.tools).toContainEqual(expect.objectContaining({ name: 'getPetById' }));
  });
  
  test('Server should call tool correctly', async () => {
    const response = await fetch(`http://localhost:${port}/mcp/${server.name}/tools/call`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-MCP-Session-ID': 'test-session'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '2',
        method: 'tools/call',
        params: {
          name: 'getPetById',
          arguments: { petId: 5 }
        }
      })
    });
    
    const data = await response.json();
    expect(data.result).toBeDefined();
    console.log('result', data.result);
  });
  
  // test('Server should publish to channel', async () => {
  //   const result = await server.publishToChannel('test-channel', { message: 'test' });
  //   expect(result).toBe(true);
  // });
  
  afterAll(done => {
    // Close the server
    if (server_instance) {
      server_instance.close(() => {
        console.log('Test server closed');
        done();
      });
    } else {
      done();
    }
  });
});
