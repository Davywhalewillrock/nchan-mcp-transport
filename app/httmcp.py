import base64
import logging
import json
import uuid
from typing import Any, Mapping
# from starlette.responses import JSONResponse
from starlette.background import BackgroundTask
from fastapi import FastAPI, Header, Response
from mcp.types import *
from mcp.server.fastmcp import FastMCP
import httpx
from fastapi.routing import APIRouter


logger = logging.getLogger(__name__)

class JSONResponse(Response):
    media_type = "application/json"

    def __init__(
        self,
        content: Any,
        status_code: int = 200,
        headers: Mapping[str, str] | None = None,
        media_type: str | None = None,
        background: BackgroundTask | None = None,
    ) -> None:
        super().__init__(content, status_code, headers, media_type, background)

    def render(self, content: Any) -> bytes:
        try:
            return content.model_dump_json().encode("utf-8")
        except Exception:
            pass
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")
    
class HTTMCP(FastMCP):

    def __init__(
        self, name: str | None = None,
        instructions: str | None = None,
        publish_server: str | None = None,
        api_prefix: str = "",
        **settings: Any
    ):
        self._publish_server = publish_server
        self.api_prefix = api_prefix
        super().__init__(name, instructions, **settings)

    async def publish_to_channel(self, channel_id: str, message: dict, envent: str = "message") -> bool:
        """Publish a message to an nchan channel."""
        async with httpx.AsyncClient() as client:
            # In a real scenario, you'd need the actual URL of your nchan server
            headers = {
                "Content-Type": "application/json",
                "X-EventSource-Event": envent,
            }
            try:
                response = await client.post(
                    f"{self._publish_server}/mcp/{self.name}/{channel_id}", 
                    data=json.dumps(message) if envent == "message" else message,
                    headers=headers
                )
                return response.status_code == 200
            except Exception as e:
                logger.error(f"Error publishing to channel: {str(e)}")
                return False

    @property
    def router(self) -> APIRouter:
        router = APIRouter(prefix=self.api_prefix if self.api_prefix else f"/mcp/{self.name}")
        router.add_api_route("/", self.start_session, methods=["GET"])
        router.add_api_route("/endpoint", self.send_endpoint, methods=["GET"])
        router.add_api_route("/endpoint", self.return_endpoint, methods=["POST"])
        router.add_api_route("/initialize", self.wrap_method(self.initialize), methods=["POST"])
        router.add_api_route("/resources/list", self.wrap_method(self.list_resources_handler), methods=["POST"])
        router.add_api_route("/resources/read", self.wrap_method(self.read_resource_handler), methods=["POST"])
        router.add_api_route("/prompts/list", self.wrap_method(self.list_prompts_handler), methods=["POST"])
        router.add_api_route("/prompts/get", self.wrap_method(self.get_prompt_handler), methods=["POST"])
        router.add_api_route("/resources/templates/list", self.wrap_method(self.list_resource_templates_handler), methods=["POST"])
        router.add_api_route("/tools/list", self.wrap_method(self.list_tools_handler), methods=["POST"])
        router.add_api_route("/tools/call", self.wrap_method(self.call_tools_handler), methods=["POST"])
        # TODO call sigle tool???
        for tool in self._tool_manager.list_tools():
            def wrap_tool(tool):
                async def wrap_call_tool(message: JSONRPCMessage, **kwargs):
                    return await self.call_tool(tool.name, message.root.params.get("arguments", {}))
                return wrap_call_tool
            router.add_api_route("/tools/call/{name}", self.wrap_method(wrap_tool(tool)), methods=["POST"])

        # empty response
        async def empty_response(message: JSONRPCMessage, **kwargs): 
            return ServerResult(EmptyResult())
        router.add_api_route("/ping", self.wrap_method(empty_response), methods=["POST"])
        router.add_api_route("/notifications/initialized", self.wrap_method(empty_response), methods=["POST"])
        router.add_api_route("/notifications/cancelled", self.wrap_method(empty_response), methods=["POST"])
        return router

    def wrap_method(self, method):
        async def wrapper(
            message: JSONRPCMessage,
            x_mcp_session_id: Annotated[str | None, Header()] = None,
            x_mcp_transport: Annotated[str | None, Header()] = None,
        ):
            requst_id = message.root.id if hasattr(message.root, "id") else None
            try:
                result = await method(message, session_id=x_mcp_session_id, transport=x_mcp_transport)
                try:
                    result = result.model_dump(exclude_unset=True, exclude_none=True, by_alias=True)
                except Exception as e:
                    pass
                response = JSONRPCResponse(id=requst_id or "", jsonrpc=message.root.jsonrpc, result=result)
            except Exception as e:
                logger.error(f"Error processing request {message}: {str(e)}")
                response = JSONRPCError(id=requst_id, error=ErrorData(code=0, message=str(e)))
            return Response(
                content=response.model_dump_json(),
                media_type="application/json",
                status_code=200,
            )
        return wrapper

    async def initialize(self, message: JSONRPCMessage, **kwargs) -> InitializeResult:
        """Initialize the MCP server."""
        options = self._mcp_server.create_initialization_options()
        return InitializeResult(
            protocolVersion=LATEST_PROTOCOL_VERSION,
            capabilities=options.capabilities,
            serverInfo=Implementation(
                name=options.server_name,
                version=options.server_version,
            ),
            instructions=options.instructions,
        )

    async def start_session(self):
        session_id = str(uuid.uuid4())
        return Response(
            status_code=200,
            headers={
                "X-Accel-Redirect": f"/internal/{self.name}/{session_id}",
                "X-Accel-Buffering": "no"
            }
        )
    
    async def return_endpoint(self):
        return Response(status_code=304)

    async def send_endpoint(
        self, x_mcp_session_id: Annotated[str | None, Header()] = None,
        x_mcp_transport: Annotated[str | None, Header()] = None,
    ):
        if x_mcp_transport == "sse":
            await self.publish_to_channel(x_mcp_session_id, f"/mcp/{self.name}/{x_mcp_session_id}", "endpoint")

    async def list_resources_handler(self, message: JSONRPCMessage, **kwargs) -> ListResourcesResult:
        resources = await super().list_resources()
        return ListResourcesResult(resources=resources)
    
    async def read_resource_handler(self, message: JSONRPCMessage, **kwargs) -> ReadResourceResult:
        uri = message.root.params.get("uri")
        data = await super().read_resource(uri)

        return ReadResourceResult(contents=[TextResourceContents(
            uri=uri,
            mimeType=c.mime_type or "text/plain",
            text=c.content,
        ) if isinstance(c.content, str) else BlobResourceContents(
            uri=uri,
            mimeType=c.mime_type or "application/octet-stream",
            blob=base64.urlsafe_b64encode(c.content).decode(),
        ) for c in data])

    async def list_prompts_handler(self, message: JSONRPCMessage, **kwargs) -> ListPromptsResult:
        prompts = await super().list_prompts()
        return ListPromptsResult(prompts=prompts)

    async def get_prompt_handler(self, message: JSONRPCMessage, **kwargs) -> GetPromptResult:
        return await super().get_prompt(message.root.method, message.root.params)

    async def list_resource_templates_handler(self, message: JSONRPCMessage, **kwargs) -> ListResourceTemplatesResult:
        templates = await super().list_resource_templates()
        return ListResourceTemplatesResult(resourceTemplates=templates)

    async def list_tools_handler(self, message: JSONRPCMessage, **kwargs) -> ListToolsResult:
        tools = await super().list_tools()
        return ListToolsResult(tools=tools)

    async def call_tools_handler(self, message: JSONRPCMessage, **kwargs) -> CallToolResult:
        try:
            content = await super().call_tool(message.root.params.get('name', ''), message.root.params.get('arguments', {}))
            return CallToolResult(content=list(content), isError=False)
        except Exception as e:
            logger.error(f"Error calling tool: {str(e)}")
            return CallToolResult(content=[], isError=True)
