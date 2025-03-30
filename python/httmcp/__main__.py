#!/usr/bin/env python
import argparse
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from httmcp import OpenAPIMCP
import httpx
from functools import cached_property


parser = argparse.ArgumentParser(
    prog="httmcp",
    description="HTTMCP CLI - Deploy OpenAPI services with Nchan MCP Transport",
)
parser.add_argument("-f", "--openapi-file", required=True, help="OpenAPI specification URL or file path")
parser.add_argument("-n", "--name", default="", help="Name of this MCP server (default: '')")
parser.add_argument("-p", "--publish-server", required=True, help="Nchan publish server URL (e.g., http://nchan:80)")
parser.add_argument("-H", "--host", default="0.0.0.0", help="Host to bind the server (default: 0.0.0.0)")
parser.add_argument("-P", "--port", type=int, default=8000, help="Port to bind the server (default: 8000)")
parser.add_argument("-a", "--app_id", default="", help="feishu app_id")
parser.add_argument("-s", "--app_secret", default="", help="feishu app_secret")


args = parser.parse_args()


class FeishuBotClientAuth(httpx.Auth):

    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret

    @cached_property
    def tenent_access_token(self):
        # This is a placeholder for the actual token retrieval logic
        # In a real implementation, you would retrieve the token from Feishu API
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        response = httpx.post(
            url,
            headers={
                "Content-Type": "application/json",
            },
            json={
                "app_id": self.app_id,
                "app_secret": self.app_secret,
            },
        )
        return response.json().get("tenant_access_token")

    def auth_flow(self, request: httpx.Request):
        # Add the app_id and app_secret as headers
        request.headers["Authorization"] = f"Bearer {self.tenent_access_token}"
        yield request


def create_app():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Load the OpenAPI specification and create mcp server
        auth = FeishuBotClientAuth(
            app_id=args.app_id,
            app_secret=args.app_secret
        ) if args.app_id and args.app_secret else None
        openapi_server = await OpenAPIMCP.from_openapi(
            args.openapi_file,
            name=args.name,
            publish_server=args.publish_server,
            auth=auth, # set Authorization header
        )
        app.include_router(openapi_server.router)
        print(f"✅ Successfully mounted OpenAPI from {args.openapi_file}")
        print(f"🔌 Connected to Nchan publish server: {args.publish_server}")
        print(f"🚀 Server running at http://{args.host}:{args.port}")
        print(f"🚀 Server name: {args.name or openapi_server.name}")
        print(f"🚀 Server endpoint: {args.publish_server}{openapi_server.router.prefix}")
        yield

    return FastAPI(lifespan=lifespan)

app = create_app()

def main():
    # Run the server
    uvicorn.run(
        app,
        host=args.host, 
        port=args.port,
    )

if __name__ == "__main__":
    main()
