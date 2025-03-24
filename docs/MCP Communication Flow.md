# MCP Communication Flow Documentation

This document describes the communication flow between MCP Client, NCHAN Transport, FastAPI, and MCP Server components.

## Overview

The sequence diagram below illustrates the JSON-RPC based communication protocol used in the MCP (Model Control Protocol) system. It shows how requests flow from the client through various components and how responses and notifications are delivered back.

```mermaid
sequenceDiagram
  MCP Client->>NCHAN Transport: connect
  activate NCHAN Transport
  MCP Client-->>NCHAN Transport: jsonrpc request
  NCHAN Transport-->>FastAPI: nchan_publisher_upstream_request
  FastAPI-->>MCP Server: call_tool(name, args)
  MCP Server-->>FastAPI: result
  FastAPI-->>NCHAN Transport: jsonrpc response
  NCHAN Transport-->> MCP Client: jsonrpc response
  
  MCP Client-->>NCHAN Transport: jsonrpc request
  NCHAN Transport-->>FastAPI: nchan_publisher_upstream_request
  FastAPI-->>MCP Server: call_tool(name, args) in backend
  MCP Server-->>NCHAN Transport: push notification
  NCHAN Transport-->> MCP Client: notification
  MCP Server-->>NCHAN Transport: push jsonrpc response
  NCHAN Transport-->> MCP Client: jsonrpc response
  NCHAN Transport->> MCP Client: close
  deactivate NCHAN Transport
```

## Component Descriptions

- **MCP Client**: The client application that initiates requests to the MCP system.
- **NCHAN Transport**: NCHAN adapter that handles WebSocket connections and message routing.
- **FastAPI**: API service that processes requests and communicates with the MCP Server.
- **MCP Server**: Backend server that processes tool calls and generates responses.

## Communication Flow Explanation

### Initial Connection and Simple Request

1. **Connection Establishment**:
   - MCP Client initiates a connection to NCHAN Transport
   - NCHAN Transport activates and establishes the communication channel

2. **Basic Request-Response Flow**:
   - Client sends a JSON-RPC request to NCHAN Transport
   - NCHAN Transport forwards the request to FastAPI via nchan_publisher_upstream_request
   - FastAPI calls the appropriate tool on the MCP Server with specified arguments
   - MCP Server processes the request and returns the result to FastAPI
   - FastAPI constructs a JSON-RPC response and sends it back through NCHAN Transport
   - NCHAN Transport delivers the response to the MCP Client

### Advanced Request with Notifications

3. **Request with Background Processing**:
   - Client sends another JSON-RPC request to NCHAN Transport
   - Request is forwarded through NCHAN Transport to FastAPI
   - FastAPI initiates a background tool call on the MCP Server

4. **Notification and Response Handling**:
   - While processing, MCP Server sends push notifications through NCHAN Transport
   - NCHAN Transport forwards these notifications to the MCP Client in real-time
   - After completion, MCP Server pushes the final JSON-RPC response
   - NCHAN Transport delivers the response to the MCP Client
   - Finally, NCHAN Transport closes the connection with the client

## Common Use Cases

This communication pattern is particularly useful for:
- Long-running operations that require progress updates
- Real-time feedback during model execution
- Stateful operations that need to maintain connection context

## Implementation Notes

When implementing clients for this protocol, ensure proper handling of:
- Connection interruptions
- Notification message processing
- Request-response correlation using JSON-RPC IDs
