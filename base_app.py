import asyncio
import logging
import json
import uuid
from starlette.responses import JSONResponse
from fastapi import FastAPI, Header, Response
from mcp.types import *
import httpx
from fastapi.routing import APIRouter
from fastapi.exceptions import HTTPException, RequestValidationError, FastAPIError


logger = logging.getLogger(__name__)

async def publish_to_channel(mcp_server_name, channel_id, message, envent="message"):
    """Publish a message to an nchan channel."""
    async with httpx.AsyncClient() as client:
        # In a real scenario, you'd need the actual URL of your nchan server
        url = f"http://127.0.0.1:80/mcp/{mcp_server_name}/{channel_id}"
        headers = {
            "Content-Type": "application/json",
            "X-EventSource-Event": envent,
        }
        try:
            response = await client.post(
                url, 
                data=json.dumps(message) if envent == "message" else message,
                headers=headers
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error publishing to channel: {str(e)}")
            return False


app = FastAPI()


# Create a custom router that allows route replacement
class ReplacableRouter(APIRouter):
    def add_api_route(self, path, endpoint, **kwargs):
        # Remove any existing route with the same path and methods
        methods = kwargs.get('methods', ['GET'])
        for method in methods:
            for route in list(self.routes):
                if route.path == path and method in route.methods:
                    self.routes.remove(route)
        # Add the new route
        super().add_api_route(path, endpoint, **kwargs)

# Replace the default FastAPI router with our custom one
app.router.__class__ = ReplacableRouter


def jsonrpc_response(method):
    async def wrapper(name: str, session_id: str, message: JSONRPCMessage):
        result = await method(name, session_id, message)
        return JSONResponse({
            "id": message.root.id,
            "jsonrpc": message.root.jsonrpc,
            "result": result
        })
    return wrapper


@app.exception_handler(HTTPException)
async def http_exception_handler(req, exc):
    logger.error(f"Error processing request {req} {exc}")
    return Response(status_code=304)

@app.exception_handler(RequestValidationError)
async def http_exception_handler(req, exc):
    logger.error(f"Error validate request {req} {exc}")
    return Response(status_code=304)


@app.exception_handler(404)
async def http_exception_handler(req, exc):
    logger.error(f"Error request not found {req} {exc}")
    if req.method == "POST":
        try:
            # empty message response
            message = JSONRPCMessage.model_validate(await req.json())
            return JSONResponse({
                "id": message.root.id,
                "jsonrpc": message.root.jsonrpc,
                "result": {}
            })
        except Exception as e:
            logger.error(f"Error parsing request: {str(e)}")
    return Response(status_code=304)

@app.get("/mcp/{name}")
def start_mcp_session(name: str):
    session_id = str(uuid.uuid4())
    return Response(
        status_code=200,
        headers={
            "X-Accel-Redirect": f"/internal/{name}/{session_id}",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/mcp/{name}/{session_id}/endpoint")
async def endpoint(name: str, session_id: str, x_mcp_transport: Annotated[str | None, Header()] = None):
    print("endpoint", name, session_id, x_mcp_transport)
    if x_mcp_transport == "sse":
        asyncio.gather(
            publish_to_channel(name, session_id, f"/mcp/{name}/{session_id}", "endpoint")
        )

@app.post("/mcp/{name}/{session_id}/endpoint")
async def nchan_subscribe_request(name: str, session_id: str):
    logger.info("nchan_subscribe_request %r %r", name, session_id)
    return Response(status_code=304)

@app.post("/mcp/{name}/{session_id}/initialize")
@jsonrpc_response
async def initialize(name: str, session_id: str, message: JSONRPCMessage):
    logger.info("Initialize MCP server %r", message)
    return {
        "protocolVersion": message.root.params.get("protocolVersion"),
        "capabilities": {
            "experimental": {},
            "tools": {"listChanged": False}
        },
        "serverInfo": {
            "name": name,
            "version": "1.0.0"
        }
    }

@app.post("/mcp/{name}/{session_id}/tools/list")
@jsonrpc_response
async def tools(name: str, session_id: str, message: JSONRPCMessage):
    return {
        "tools": [
            {
                "name": "tool1",
                "description": "Tool 1",
                "inputSchema": {
                    "type": "object",
                    "properties": {"value": {"type": "number"}},
                    "required": ["value"]    
                },
            }
        ]
    }

@app.post("/mcp/{name}/{session_id}/tools/call")
@jsonrpc_response
async def call_tool(name: str, session_id: str, message: JSONRPCMessage):
    return {
        "content": [
            {
                "type": "text",
                "text": "Hello, world!"
            }
        ]
    }






if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)