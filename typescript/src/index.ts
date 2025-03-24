import express, { Request, Response, Router } from "express";
import { nanoid } from "nanoid";
import { McpServer,  } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { Implementation, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";


type HTTMCPImplementation = Implementation & {
    publishServer?: string;
    apiPrefix?: string;
};

export default class HTTMCP extends McpServer {
    private name: string = "httmcp";
    private publishServer?: string;
    private apiPrefix: string;

    constructor(serverInfo: HTTMCPImplementation, options?: ServerOptions) {
        const { publishServer, apiPrefix, ...restServerInfo } = serverInfo;
        super(restServerInfo, options);
        this.publishServer = publishServer;
        this.apiPrefix = apiPrefix || "";
        console.debug('HTTP MCP SDK initialized');
    }

    async publishToChannel(channelId: string, message: any, event: string = "message"): Promise<boolean> {
        try {
            if (!this.publishServer) {
                console.error("Publish server not configured");
                return false;
            }

            const data = typeof message === 'object' ? JSON.stringify(message) : message;
            
            const response = await fetch(`${this.publishServer}/mcp/${this.name}/${channelId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-EventSource-Event': event
                },
                body: data
            });
            
            return response.status === 200;
        } catch (e) {
            console.error(`Error publishing to channel: ${e}`);
            return false;
        }
    }

    getApp(): Router {
        const router = express.Router();
        router.use(express.json()); // for parsing application/json
        const prefix = this.apiPrefix || `/mcp/${this.name}`;
        
        // Session start endpoint
        router.get("/", (_: Request, res: Response) => {
            const sessionId = nanoid();
            res.setHeader('X-Accel-Redirect', `/internal/${this.name}/${sessionId}`);
            res.setHeader('X-Accel-Buffering', 'no');
            res.status(200).end();
        });

        // Endpoint info
        router.get("/endpoint", async (req: Request, res: Response) => {
            const sessionId = req.header('X-MCP-Session-ID');
            const transport = req.header('X-MCP-Transport');
            
            if (transport === "sse" && sessionId) {
                await this.publishToChannel(
                    sessionId, 
                    `${prefix}/${sessionId}`, 
                    "endpoint"
                );
            }
            res.status(200).end();
        });

        // MCP protocol endpoints - These match what's in the Python implementation
        router.post("/initialize", this.handleMcpRequest.bind(this));
        router.post("/resources/list", this.handleMcpRequest.bind(this));
        router.post("/resources/read", this.handleMcpRequest.bind(this));
        router.post("/prompts/list", this.handleMcpRequest.bind(this));
        router.post("/prompts/get", this.handleMcpRequest.bind(this));
        router.post("/resources/templates/list", this.handleMcpRequest.bind(this));
        router.post("/tools/list", this.handleMcpRequest.bind(this));
        router.post("/tools/call", this.handleMcpRequest.bind(this));
        router.post("/ping", this.handleEmptyResponse.bind(this));
        router.post("/notifications/initialized", this.handleEmptyResponse.bind(this));
        router.post("/notifications/cancelled", this.handleEmptyResponse.bind(this));

        return router;
    }

    // private _onrequest(request: JSONRPCRequest): void {
    //     const handler =
    //       this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
    
    //     if (handler === undefined) {
    //       this._transport
    //         ?.send({
    //           jsonrpc: "2.0",
    //           id: request.id,
    //           error: {
    //             code: ErrorCode.MethodNotFound,
    //             message: "Method not found",
    //           },
    //         })
    //         .catch((error) =>
    //           this._onerror(
    //             new Error(`Failed to send an error response: ${error}`),
    //           ),
    //         );
    //       return;
    //     }

    private _onrequest(request: JSONRPCRequest): Promise<any> {
        // @ts-ignore
        const handler = this.server._requestHandlers.get(request.method) ?? this.server.fallbackRequestHandler;
    
        if (handler === undefined) {
          return Promise.reject("Method not found");
        }
    
        const abortController = new AbortController();
        // @ts-ignore
        this.server._requestHandlerAbortControllers.set(request.id, abortController);
    
        // Create extra object with both abort signal and sessionId from transport
        const extra: RequestHandlerExtra = {
          signal: abortController.signal,
          sessionId: request.params?._meta?.sessionId as string,
        };
    
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        return Promise.resolve()
          .then(() => handler(request, extra))
          .then(
            (result) => {
              if (abortController.signal.aborted) {
                return;
              }
    
            //   return this._transport?.send({
            //     result,
            //     jsonrpc: "2.0",
            //     id: request.id,
            //   });
            },
            (error) => {
              if (abortController.signal.aborted) {
                return;
              }
    
            //   return this._transport?.send({
            //     jsonrpc: "2.0",
            //     id: request.id,
            //     error: {
            //       code: Number.isSafeInteger(error["code"])
            //         ? error["code"]
            //         : ErrorCode.InternalError,
            //       message: error.message ?? "Internal error",
            //     },
              });
            },
          )
          .catch((error) =>
            // this._onerror(new Error(`Failed to send response: ${error}`)),
          )
          .finally(() => {
            this.server._requestHandlerAbortControllers.delete(request.id);
          });
      }

    private async handleMcpRequest(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.header('X-MCP-Session-ID');
            const request = req.body as JSONRPCRequest;
            if (request.params?._meta) {
                request.params._meta.sessionId = sessionId
            }
            // @ts-ignore
            this._onrequest(request);
            const transport = this.transports.get(sessionId || '');
            
            if (!transport) {
                return res.status(404).json({ error: "Session not found" });
            }
            
            // Let the transport handle the request
            await transport.handlePostMessage(req, res);
        } catch (error) {
            console.error(`Error handling MCP request: ${error}`);
            res.status(500).json({ 
                jsonrpc: "2.0", 
                id: req.body?.id || null,
                error: {
                    code: 0,
                    message: `Internal server error: ${error}`
                }
            });
        }
    }
    
    private async handleEmptyResponse(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            jsonrpc: "2.0",
            id: req.body?.id || "",
            result: {}
        });
    }
}