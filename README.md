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

## 优点

1. **性能优势**: 使用Nginx和Nchan处理长连接，性能远优于纯Python实现
2. **可扩展性**: 利用Nginx的高并发特性，能够处理大量并发连接
3. **简单部署**: 使用Docker封装，便于部署和横向扩展
4. **协议适应性**: 自动检测并适配最合适的连接方式(WebSocket/SSE)
5. **稳定性**: 通过Nchan提供可靠的消息缓存和传递机制

## 局限性

1. **依赖Nginx**: 必须运行Nginx+Nchan模块
2. **配置复杂度**: 需要正确配置Nginx和应用服务
3. **调试难度**: 分布式系统增加了问题排查的复杂性

## 技术架构

- **前端代理**: Nginx + Nchan模块
- **后端服务**: FastAPI + HTTMCP
- **容器化**: Docker
- **通信协议**: MCP (Model Control Protocol)

## 快速开始

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

#### 客户端集成

在你的客户端代码中:

```javascript
// WebSocket 示例
const ws = new WebSocket('ws://localhost:80/mcp/httmcp/SESSION_ID');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};

// SSE 示例
const eventSource = new EventSource('http://localhost:80/mcp/httmcp/SESSION_ID');
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
