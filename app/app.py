import asyncio
from mcp.server.fastmcp import Context
from httmcp import *

app = FastAPI()
server = HTTMCP(
    "httmcp",
    publish_server="http://nchan:80",
)

@server.tool()
async def hello_world() -> str:
    return "Hello, world!"

@server.tool()
async def add(a: int, b: int) -> int:
    return a + b

@server.tool()
async def long_task(t: int, ctx: Context) -> bool | None:
    async def task():
        await asyncio.sleep(t)
        request_id = ctx.request_context.request_id
        session_id = ctx.request_context.meta.session_id
        logger.info(f"Task completed for session {session_id}")
        await server.publish_to_channel(session_id, JSONRPCResponse(
            jsonrpc="2.0",
            id=request_id,
            result=CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"sleep {t} Task completed"
                    )
                ],
            ).model_dump(),
        ).model_dump_json(by_alias=True, exclude_none=True))
        # logger.error("ctx %r", (ctx.client_id, ctx.request_context))
    asyncio.gather(task())
    # skip message and send result by using
    return Response(status_code=204)

@server.resource("resource://my-resource")
def get_data() -> str:
    return "Hello, world!"


logger.debug("Server started", server.router.routes)
app.include_router(server.router)

# can add more mcp servers here
# app.include_router(server2.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)