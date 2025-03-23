# 🚀 Nchan MCP 传输层

> 一个高性能的WebSocket/SSE传输层和网关，专为**Anthropic的MCP（模型上下文协议）**设计 — 由Nginx、Nchan和FastAPI提供支持。  
> 用于构建与Claude和其他LLM代理的**实时、可扩展AI集成**。

---

## ✨ 这是什么？

**Nchan MCP Transport**为MCP客户端（如Claude）提供了一个**实时API网关**，可通过以下方式与您的工具和服务通信：

- 🧵 **WebSocket**或**服务器发送事件(SSE)**  
- ⚡️ **兼容流式HTTP**  
- 🧠 由Nginx + Nchan提供支持，实现**低延迟发布/订阅**
- 🛠 集成FastAPI用于后端逻辑和OpenAPI工具

> ✅ 非常适合AI开发者构建**Claude插件**、**LLM代理**或通过MCP将**外部API**集成到Claude中。

---

## 🧩 主要特性

| 特性                            | 描述                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| 🔄 **双协议支持**     | 无缝支持**WebSocket**和**SSE**，具有自动检测功能     |
| 🚀 **高性能发布/订阅** | 基于**Nginx + Nchan**构建，可处理数千个并发连接    |
| 🔌 **MCP兼容传输层**   | 完全实现**模型上下文协议**（JSON-RPC 2.0）                 |
| 🧰 **OpenAPI集成**       | 从任何OpenAPI规范自动生成MCP工具                              |
| 🪝 **工具/资源系统**    | 使用Python装饰器注册工具和资源                      |
| 📡 **异步执行**    | 后台任务队列 + 通过推送通知提供实时进度更新       |
| 🧱 **Docker化部署**     | 使用Docker Compose轻松启动                                         |

---

## 🧠 为什么使用本项目？

MCP允许AI助手（如**Claude**）与外部工具通信。但是：
- 原生MCP是**HTTP+SSE**，在处理**长任务**、**网络不稳定**和**高并发**时面临挑战
- Claude原生不支持WebSockets — 本项目**弥补了这一差距**
- 纯Python的服务器端逻辑（如`FastMCP`）可能**在负载下无法扩展**

✅ **Nchan MCP Transport**为您提供：
- Web级别的性能（Nginx/Nchan）
- 由FastAPI提供支持的后端工具
- 向Claude客户端实时事件传递
- 即插即用的OpenAPI到Claude集成

---

## 🚀 快速开始

### 📦 1. 安装客户端SDK

```bash
pip install httmcp
```

### 🧪 2. 在Docker中运行演示

```bash
git clone https://github.com/yourusername/nchan-mcp-transport.git
cd nchan-mcp-transport
docker-compose up -d
```

### 🛠 3. 定义您的工具

```python
@server.tool()
async def search_docs(query: str) -> str:
    return f"Searching for {query}..."
```

### 🧬 4. 暴露OpenAPI服务（可选）

```python
openapi_server = await OpenAPIMCP.from_openapi("https://example.com/openapi.json", publish_server="http://nchan:80")
app.include_router(openapi_server.router)
```

---

## 📚 使用场景

- 通过WebSocket/SSE提供Claude插件服务器
- 实时LLM代理后端（LangChain/AutoGen风格）
- 将Claude连接到内部API（通过OpenAPI）
- 高性能工具/服务桥接MCP

---

## 🔒 要求

- 安装了Nchan模块的Nginx（Docker镜像中预装）
- Python 3.9+
- Docker / Docker Compose

---

## 🛠 技术栈

- 🧩 **Nginx + Nchan** – 持久连接管理和发布/订阅
- ⚙️ **FastAPI** – 后端逻辑和JSON-RPC路由
- 🐍 **HTTMCP SDK** – 完整的MCP协议实现
- 🐳 **Docker** – 部署就绪

---

## 📎 关键词

`mcp transport`, `nchan websocket`, `sse for anthropic`, `mcp jsonrpc gateway`, `claude plugin backend`, `streamable http`, `real-time ai api gateway`, `fastapi websocket mcp`, `mcp pubsub`, `mcp openapi bridge`

---

## 🤝 贡献

欢迎提交Pull requests！如果您想帮助改进，请提交问题：
- 性能
- 部署
- SDK集成

---

## 📄 许可证

MIT许可证
