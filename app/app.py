from httmcp import *

app = FastAPI()
server = HTTMCP(
    "httmcp",
    publish_server="http://nchan:80",
)


logger.debug("Server started", server.router.routes)
app.include_router(server.router)


@server.tool()
async def hello_world() -> str:
    return "Hello, world!"

@server.tool()
async def add(a: int, b: int) -> int:
    return a + b

@server.resource("resource://my-resource")
def get_data() -> str:
    return "Hello, world!"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)