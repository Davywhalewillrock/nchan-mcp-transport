# Nchan MCP Transport

基于Nginx+Nchan实现的高性能MCP(Model Control Protocol)传输层，支持WebSocket和SSE连接方式，为AI模型提供可靠的通信管道。

## 项目简介

Nchan-MCP-Transport是一个中间件服务，通过整合Nginx的Nchan模块与FastAPI后端，为MCP协议提供高性能、稳定的传输层实现。它解决了AI模型服务长连接管理、消息发布订阅以及高并发场景下的通信问题。

## 特性

- **双协议支持**: 同时支持WebSocket和Server-Sent Events (SSE)传输模式
- **高性能**: 利用Nginx+Nchan实现高效的消息发布订阅系统
- **MCP协议实现**: 完整支持MCP协议规范
- **简单集成**: 通过FastAPI框架提供简洁的API设计
- **会话管理**: 自动处理MCP会话创建和维护
- **工具系统**: 支持MCP工具定义和调用
- **资源管理**: 内置资源管理功能
- **OpenAPI集成**: 支持将OpenAPI规范自动转换为MCP服务

## 优点

1. **性能优势**: 使用Nginx和Nchan处理长连接，性能远优于纯Python实现
2. **可扩展性**: 利用Nginx的高并发特性，能够处理大量并发连接
3. **简单部署**: 使用Docker封装，便于部署和横向扩展
4. **协议适应性**: 自动检测并适配最合适的连接方式(WebSocket/SSE)
5. **稳定性**: 通过Nchan提供可靠的消息缓存和传递机制
6. **灵活扩展**: 支持通过OpenAPI规范快速集成第三方服务

## 局限性

1. **依赖Nginx**: 必须运行Nginx+Nchan模块
2. **配置复杂度**: 需要正确配置Nginx和应用服务
3. **调试难度**: 分布式系统增加了问题排查的复杂性

## 技术架构

- **前端代理**: Nginx + Nchan模块
- **后端服务**: FastAPI + HTTMCP
- **容器化**: Docker
- **通信协议**: MCP (Model Control Protocol)


## 流程图
1. 其中session_id（直接等同nchan_channel_id）会从创建连接开始一直到连接结束一直保持
2. 如果是执行时间短的任务，可以直接返回
3. 如果是执行时间长的任务，可以放到异步的队列执行，只需要中间推送进度，以及最后推送结果即可


```mermaid
sequenceDiagram
  MCP Client->>NCNAN: connect
  activate NCNAN
  MCP Client-->>NCNAN: jsonrpc request
  NCNAN-->>FastAPI: nchan_publisher_upstream_request
  FastAPI-->>MCP Server: call_tool(name, args)
  MCP Server-->>FastAPI: result
  FastAPI-->>NCNAN: jsonrpc response
  NCNAN-->> MCP Client: jsonrpc response
  
  MCP Client-->>NCNAN: jsonrpc request
  NCNAN-->>FastAPI: nchan_publisher_upstream_request
  FastAPI-->>MCP Server: call_tool(name, args) in backend
  MCP Server-->>NCNAN: push notification
  NCNAN-->> MCP Client: notification
  MCP Server-->>NCNAN: push jsonrpc response
  NCNAN-->> MCP Client: jsonrpc response
  NCNAN->> MCP Client: close
  deactivate NCNAN
```


## 快速开始

可以使用pip 安装依赖本地使用:
```bash
pip install httmcp
```

### 安装部署

1. 克隆项目:

```bash
git clone https://github.com/yourusername/nchan-mcp-transport.git
cd nchan-mcp-transport
```

2. 启动服务:

```bash
docker-compose up -d
```

### 使用方法

#### 创建MCP Server
```python
server = HTTMCP(
    "httmcp",
    publish_server="http://nchan:80",
)
```

#### 自定义工具创建

在`app/app.py`中，可以通过装饰器方式添加自定义工具:

```python
@server.tool()
async def your_tool_name(param1: type, param2: type) -> return_type:
    # 实现你的工具逻辑
    return result
```

#### 自定义Resource
```python
@server.resource("resource://my-resource")
def get_data() -> str:
    return "Hello, world!"
```

#### 启动Server

```python
app = FastAPI()

# 这里支持一个服务器启动多个mcp server
app.include_router(server.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### 使用OpenAPIMCP集成OpenAPI服务

可以通过OpenAPI规范文件轻松创建MCP服务:

```python
async def create_openapi_mcp_server():
    # OpenAPI规范文件URL
    url = "https://example.com/api-spec.json"
    # 创建OpenAPIMCP实例
    openapi_server = await OpenAPIMCP.from_openapi(url, publish_server="http://nchan:80")
    # 挂载到FastAPI应用
    app.include_router(openapi_server.router)

# 运行创建函数
asyncio.run(create_openapi_mcp_server())
```

这将把OpenAPI中定义的所有操作自动转换为MCP工具，可以通过MCP协议调用。

## 使用OpenAPIMCP集成OpenAPI服务

OpenAPIMCP允许您通过OpenAPI规范文件轻松创建MCP服务，从而将现有的RESTful API转换为可以通过MCP协议调用的服务。

### 实现逻辑

OpenAPIMCP读取OpenAPI规范文件，并将其中的每个API端点转换为一个MCP工具。当客户端通过MCP调用这些工具时，OpenAPIMCP会将请求转发到相应的RESTful API，并将响应转换回MCP格式。

### 使用方式

1.  **准备OpenAPI规范文件**：
    确保您有一个有效的OpenAPI规范文件（例如，`openapi.json`）。

2.  **创建OpenAPIMCP实例**：
    在您的FastAPI应用中，使用`OpenAPIMCP.from_openapi`方法创建一个OpenAPIMCP实例。

    ```python
    async def create_openapi_mcp_server():
        # OpenAPI规范文件URL
        url = "https://example.com/api-spec.json"
        # 创建OpenAPIMCP实例
        openapi_server = await OpenAPIMCP.from_openapi(url, publish_server="http://nchan:80")
        # 挂载到FastAPI应用
        app.include_router(openapi_server.router)

    # 运行创建函数
    asyncio.run(create_openapi_mcp_server())
    ```

3.  **挂载到FastAPI应用**：
    将OpenAPIMCP实例的`router`挂载到您的FastAPI应用中，以便处理MCP请求。

4.  **配置Nchan**：
    确保您的Nchan配置正确，以便将MCP请求路由到FastAPI应用。

### 示例

以下是一个完整的示例，展示如何使用OpenAPIMCP将OpenAPI规范文件转换为MCP服务：

```python
from fastapi import FastAPI
import asyncio
from httmcp import OpenAPIMCP

app = FastAPI()

async def create_openapi_mcp_server():
    # OpenAPI规范文件URL
    url = "https://petstore3.swagger.io/api/v3/openapi.json"
    # 创建OpenAPIMCP实例
    openapi_server = await OpenAPIMCP.from_openapi(url, publish_server="http://localhost:80")
    # 挂载到FastAPI应用
    app.include_router(openapi_server.router)

# 运行创建函数
asyncio.run(create_openapi_mcp_server())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

在这个例子中，我们使用了一个来自Swagger Petstore的OpenAPI规范文件。您可以将其替换为您自己的OpenAPI规范文件URL。

### 客户端调用

一旦OpenAPIMCP服务器启动并运行，您可以使用MCP客户端调用OpenAPI中定义的任何操作。例如，如果您的OpenAPI规范中定义了一个名为`getPetById`的操作，您可以使用以下MCP请求来调用它：

```json
{
  "jsonrpc": "2.0",
  "method": "getPetById",
  "params": {
    "petId": 123
  },
  "id": "1"
}
```

请确保您的MCP客户端配置正确，以便将请求发送到OpenAPIMCP服务器的`/mcp/{server_name}/tools/call`端点。

#### 客户端集成

在你的客户端代码中:

```javascript
// WebSocket 示例
const ws = new WebSocket('ws://localhost:80/mcp/httmcp');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};

// SSE 示例
const eventSource = new EventSource('http://localhost:80/mcp/httmcp');
let sessionURI
eventSource.addEventListener("endpoint", (event) => {
    sessionURI = event.data
    console.log(sessionURI)
})
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};
```

## 服务器配置指南

详细的Nginx配置在 `docker/nchan.conf` 文件中。主要包括:

1. 入口路由: `/mcp/{server_name}`
2. 通道配置: `/mcp/{server_name}/{channel_id}`
3. 内部处理: `/internal/mcp-process`

## 贡献指南

欢迎提交Issue和Pull Request，共同完善该项目。