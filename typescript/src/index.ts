import express, { Request, Response, Router } from "express";
import { randomUUID as nanoid } from "node:crypto";
import { McpServer,  } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { ErrorCode, Implementation, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import OpenAPIClientAxios, { OpenAPIClient, Operation } from 'openapi-client-axios';
import { jsonSchemaToZod } from "@n8n/json-schema-to-zod"


type HTTMCPImplementation = Implementation & {
    publishServer?: string;
    apiPrefix?: string;
};

export class HTTMCP extends McpServer {
    private name: string = "httmcp";
    private publishServer?: string;
    private apiPrefix: string;

    constructor(serverInfo: HTTMCPImplementation, options?: ServerOptions) {
        const { publishServer, apiPrefix, ...restServerInfo } = serverInfo;
        super(restServerInfo, options);
        this.name = serverInfo.name;
        this.publishServer = publishServer;
        this.apiPrefix = apiPrefix || "";
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

    get prefix(): string {
        return this.apiPrefix || `/mcp/${this.name}`;
    }

    get router(): Router {
        const router = express.Router();
        router.use(express.json()); // for parsing application/json
        const prefix = this.prefix;
        
        // Session start endpoint
        router.get("/", (_: Request, res: Response) => {
            const sessionId = nanoid();
            res.setHeader('X-Accel-Redirect', `/internal/${this.name}/${sessionId}`);
            res.setHeader('X-Accel-Buffering', 'no');
            res.status(200).end();
        });

        // Endpoint info
        router.get("/endpoint", async (req: Request, res: Response) => {
            // support stramable HTTP transport
            const sessionId = req.header('X-MCP-Session-ID') || req.header('Mcp-Session-Id');;
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

        router.post("/", this.handleMcpRequest.bind(this));  // streamable http transport
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

    private _onrequest(request: JSONRPCRequest): Promise<any> {
        // @ts-ignore
        const handler = this.server._requestHandlers.get(request.method) ?? this.server.fallbackRequestHandler;
    
        const abortController = new AbortController();
        // @ts-ignore  // skip canceling request
        // this.server._requestHandlerAbortControllers.set(request.id, abortController);

        // Create extra object with both abort signal and sessionId from transport
        const extra: RequestHandlerExtra = {
          signal: abortController.signal,
          sessionId: request.params?._meta?.sessionId as string,
        };
    
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        return Promise.resolve()
          .then(() => {
            if (handler === undefined) {
              return Promise.reject({
                code: ErrorCode.MethodNotFound,
                message: "Method not found",
              });
            }
            return handler(request, extra)
        })
          .then(
            (result) => ({ result }),
            (error) => ({ error: {
                code: Number.isSafeInteger(error["code"])
                    ? error["code"]
                    : ErrorCode.InternalError,
                message: error.message ?? "Internal error",
              }
            })
          )
          .then(res => {
            if (abortController.signal.aborted) {
              throw new Error("Request was aborted");
            }
            return {
              jsonrpc: "2.0",
              id: request.id,
              result: (res as any)?.result,
              error: (res as any)?.error,
            };
          })
          .finally(() => {
            // this.server._requestHandlerAbortControllers.delete(request.id);
          });
    }

    private async handleMcpRequest(req: Request, res: Response): Promise<void> {
        try {
            const request = req.body as JSONRPCRequest;
            if (request.params) {
                // support stramable HTTP transport
                const sessionId = req.header('X-MCP-Session-ID') || req.header('Mcp-Session-Id');
                if (!request.params?._meta) {
                    // @ts-ignore
                    request.params._meta = {};
                }
                // @ts-ignore
                request.params._meta.sessionId = sessionId
            }
            // @ts-ignore
            const response = await this._onrequest(request);
            res.status(200).json(response);
        } catch (error) {
            console.error(`Error handling MCP request: ${error}`);
            res.status(200).json({
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


type OpenAPIHTTMCPImplementation = HTTMCPImplementation & {
    definition: string;
};


export class OpenAPIMCP extends HTTMCP {

    private api: OpenAPIClientAxios;
    private client: OpenAPIClient | null = null;

    constructor(serverInfo: OpenAPIHTTMCPImplementation, options?: ServerOptions) {
        const { definition, ...restServerInfo } = serverInfo;
        super(restServerInfo, options);
        this.api = new OpenAPIClientAxios({ definition });
    }
    async init(): Promise<OpenAPIClient> {
        return this.api.init().then((client) => {
            this.client = client;
            for (const operation of this.api.getOperations()) {
                const { operationId, description } = operation;
                if (operationId) {
                    // add all tools to the mcp server
                    // @ts-ignore
                    this._registeredTools[operationId] = {
                        description,
                        inputSchema: jsonSchemaToZod(this.getInputSchema(operation)),
                        callback: this.createCallback(operation),
                    };
                }
            }
            // @ts-ignore  call private method
            this.setToolRequestHandlers()
            return this.client;
        });
    }
    getInputSchema(operation: Operation) {
        // merge parameters and requestBody to inputSchema
        const { parameters, requestBody } = operation;
        // @ts-ignore
        const content = requestBody?.content;
        const jsonSchema = (
          content?.["application/json"]?.schema ||
          content?.["application/xml"]?.schema ||
          content?.["application/x-www-form-urlencoded"]?.schema ||
          { type: "object" }
        );
        if (Array.isArray(parameters)) {
            if (!Array.isArray(jsonSchema.required)) {
                jsonSchema.required = [];
            }
            if (!jsonSchema.properties) {
                jsonSchema.properties = {};
            }
            for (const param of parameters) {
                // @ts-ignore
                jsonSchema.properties[param?.name] = param.schema;
                // @ts-ignore
                if (param.required) {
                    // @ts-ignore
                    jsonSchema.required.push(param.name);
                }
            }
        }
        return jsonSchema;
    }
    createCallback(operation: Operation) {
        const originalOperationMethod = async (args: Object) => {
            args = args || {}; // Ensure args is an object
            const { operationId, parameters } = operation;
            // pop parameters from args
            if (this.client && operationId && this.client?.[operationId]) {
                let paramArg: any = null
                // @ts-ignore
                if (Array.isArray(parameters)) {
                    paramArg = []
                    for (const param of parameters) {
                        // @ts-ignore
                        paramArg.push({ name: param.name, value: args[param.name], in: param.in })  
                        // @ts-ignore
                        delete args[param.name]
                    }
                }
                return this.client[operationId](paramArg, args)
            }
            throw new Error(`Operation ${operationId} not found`);
        };
        return originalOperationMethod;
    }
}

export default HTTMCP;