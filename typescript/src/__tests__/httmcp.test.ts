import { HTTMCP } from '../index';
import { z } from 'zod';
import express from 'express';
// @ts-ignore
import fetch from 'node-fetch';

// Create global.fetch compatible environment, as node-fetch and native fetch may conflict
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

describe('HTTMCP Tests', () => {
  let server: HTTMCP;
  let app: express.Application;
  let port: number;
  let server_instance: any;
  
  beforeAll(async () => {
    // Create Express application
    app = express();
    port = 3030;
    
    // Create HTTMCP instance
    server = new HTTMCP({
      name: 'httmcp-test',
      version: '1.0.0',
      publishServer: 'http://nchan:80'
    });
    
    // Register a simple addition tool
    server.tool('add',
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: 'text', text: String(a + b) }]
      })
    );
    
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
  
  test('Server should initialize correctly', () => {
    expect(server).toBeDefined();
  });
  
  test('Server should have tools registered', async () => {
    // Mock tool list request
    const response = await fetch(`http://localhost:${port}/mcp/httmcp-test/tools/list`, {
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
    expect(data.result).toBeDefined();
    expect(data.result.tools).toContainEqual(expect.objectContaining({ name: 'add' }));
  });
  
  test('Server should call tool correctly', async () => {
    const response = await fetch(`http://localhost:${port}/mcp/httmcp-test/tools/call`, {
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
          name: 'add',
          arguments: { a: 2, b: 3 }
        }
      })
    });
    
    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(data.result.content[0].text).toBe('5');
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
