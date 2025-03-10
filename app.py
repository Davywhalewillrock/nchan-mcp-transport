from base_app import *

@app.post("/mcp/{name}/{session_id}/initialize")
@jsonrpc_response
async def initialize(name: str, session_id: str, message: JSONRPCMessage):
    logger.info("Initialize MCP server %r", message)
    return {
        "protocolVersion": message.root.params.get("protocolVersion"),
        "capabilities": {
            "experimental": {},
            "tools": {"listChanged": True},
            "resources": {
                "listChanged": True
            },
            "prompts": {
                "listChanged": True
            }
        },
        "serverInfo": {
            "name": name,
            "version": "1.0.0"
        }
    }



@app.post("/mcp/{name}/{session_id}/tools/call")
@jsonrpc_response
async def call_tool(name: str, session_id: str, message: JSONRPCMessage):
    return {
        "content": [
            {
                "type": "text",
                "text": "Hello, world!12111"
            }
        ]
    }

@app.post("/mcp/{name}/{session_id}/resources/list")
@jsonrpc_response
async def list_resources(name: str, session_id: str, message: JSONRPCMessage):
    return {
        "resources": [
            {
                "uri": "file:///tmp/resource1",
                "description": "Resource 1",
                "mimeType": "image/png",
                "name": "file:///tmp/resource1",
            }
        ]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)