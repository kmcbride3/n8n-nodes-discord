/**
 * IPC Communication Facade
 *
 * Provides a clean, type-safe abstraction over node-ipc complexity.
 * Centralizes IPC patterns, reduces code duplication, and improves maintainability.
 *
 * This facade is V1-specific and exists to simplify legacy IPC-based bot communication.
 * V2 operations use direct Discord.js REST API calls and do not require IPC.
 *
 * @deprecated V1 IPC architecture is deprecated. Use V2 Discord.js-first operations for new workflows.
 */

import type { Socket } from 'net'
import type Ipc from 'node-ipc'

/**
 * Generic IPC request structure with type safety
 */
export interface IPCRequest<TData = unknown> {
  /** Event name to emit */
  event: string
  /** Data payload to send */
  data: TData
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
}

/**
 * Generic IPC response structure with error handling
 */
export interface IPCResponse<TResult = unknown> {
  /** Whether the request succeeded */
  success: boolean
  /** Response data if successful */
  data?: TResult
  /** Error message if failed */
  error?: string
}

/**
 * IPC Client for sending requests to bot process
 *
 * Provides type-safe request/response pattern with automatic timeout handling.
 * Use this for n8n → bot communication.
 *
 * @example
 * ```typescript
 * const client = new IPCClient(ipc);
 *
 * // Send request and wait for response
 * const response = await client.request<MessageParams, MessageResult>({
 *   event: 'send:message',
 *   data: { channelId, content },
 *   timeout: 5000
 * });
 *
 * if (response.success) {
 *   console.log('Message sent:', response.data);
 * } else {
 *   console.error('Failed:', response.error);
 * }
 * ```
 */
export class IPCClient {
  private ipc: typeof Ipc

  constructor(ipc: typeof Ipc) {
    this.ipc = ipc
  }

  /**
   * Send request to bot and wait for response with automatic timeout
   *
   * @param request - Request configuration with event, data, and optional timeout
   * @returns Promise resolving to typed response
   * @throws Error if request times out or bot is unreachable
   */
  async request<TData, TResult>(request: IPCRequest<TData>): Promise<IPCResponse<TResult>> {
    const timeout = request.timeout || 30000

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        // Clean up handlers
        this.ipc.of.bot.off(request.event, responseHandler)
        this.ipc.of.bot.off('error', errorHandler)
        reject(
          new Error(
            `IPC request timeout: ${request.event}. Bot did not respond within ${timeout}ms. Ensure bot process is running.`,
          ),
        )
      }, timeout)

      // Register response handler with manual cleanup (node-ipc doesn't have .once())
      const responseHandler = (response: TResult) => {
        clearTimeout(timeoutHandle)
        this.ipc.of.bot.off(request.event, responseHandler)
        this.ipc.of.bot.off('error', errorHandler)
        resolve({ success: true, data: response })
      }

      // Handle connection errors with manual cleanup
      const errorHandler = (error: Error) => {
        clearTimeout(timeoutHandle)
        this.ipc.of.bot.off(request.event, responseHandler)
        this.ipc.of.bot.off('error', errorHandler)
        resolve({ success: false, error: error.message })
      }

      // Register handlers (use .on() not .once() - node-ipc Client type doesn't have .once())
      this.ipc.of.bot.on(request.event, responseHandler)
      this.ipc.of.bot.on('error', errorHandler)

      // Send request to bot
      this.ipc.of.bot.emit(request.event, request.data)
    })
  }

  /**
   * Fire-and-forget IPC emit (no response expected)
   *
   * Use this for notifications or events that don't require acknowledgment.
   *
   * @param event - Event name
   * @param data - Data payload
   */
  emit<TData>(event: string, data: TData): void {
    this.ipc.of.bot.emit(event, data)
  }

  /**
   * Check if bot connection is active
   *
   * @returns True if connected to bot process
   */
  isConnected(): boolean {
    // node-ipc Client type doesn't expose .destroyed property
    // Simple existence check is sufficient for connection status
    return Boolean(this.ipc.of.bot)
  }
}

/**
 * IPC Server for handling requests from n8n nodes
 *
 * Provides type-safe event handler registration with automatic error handling.
 * Use this for bot → n8n communication.
 *
 * @example
 * ```typescript
 * const server = new IPCServer(ipc);
 *
 * // Register handler with automatic error handling
 * server.on<MessageParams, MessageResult>(
 *   'send:message',
 *   async (data, socket) => {
 *     const message = await client.channels.send(data.channelId, data.content);
 *     return { messageId: message.id };
 *   }
 * );
 * ```
 */
export class IPCServer {
  private ipc: typeof Ipc

  constructor(ipc: typeof Ipc) {
    this.ipc = ipc
  }

  /**
   * Register type-safe IPC event handler with automatic error handling
   *
   * Handler errors are automatically caught and sent as error responses.
   *
   * @param event - Event name to listen for
   * @param handler - Async handler function that processes request and returns result
   */
  on<TData, TResult>(event: string, handler: (data: TData, socket: Socket) => Promise<TResult> | TResult): void {
    this.ipc.server.on(event, async (data: TData, socket: Socket) => {
      try {
        const result = await handler(data, socket)
        this.respond(socket, event, { success: true, data: result })
      } catch (error) {
        this.respondError(socket, event, error)
      }
    })
  }

  /**
   * Send successful response to client
   *
   * @param socket - Client socket
   * @param event - Event name (for response routing)
   * @param response - Response data
   */
  private respond<TResult>(socket: Socket, event: string, response: IPCResponse<TResult>): void {
    this.ipc.server.emit(socket, event, response.data)
  }

  /**
   * Send error response to client
   *
   * @param socket - Client socket
   * @param event - Event name (for response routing)
   * @param error - Error object or message
   */
  private respondError(socket: Socket, event: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error)
    this.ipc.server.emit(socket, event, { error: errorMessage })
  }

  /**
   * Broadcast event to all connected clients
   *
   * @param event - Event name
   * @param data - Data to broadcast
   */
  broadcast<TData>(event: string, data: TData): void {
    this.ipc.server.broadcast(event, data)
  }

  /**
   * Get IPC server instance for direct access
   *
   * Note: node-ipc Server type doesn't expose some properties (like .sockets) in TypeScript definitions.
   * Use this getter if you need direct access to underlying server for advanced operations.
   *
   * @returns The underlying node-ipc server instance
   */
  getServer(): typeof this.ipc.server {
    return this.ipc.server
  }
}

/**
 * Factory function for creating IPC client instance
 *
 * @param ipc - node-ipc instance
 * @returns IPCClient wrapper
 */
export function createIPCClient(ipc: typeof Ipc): IPCClient {
  return new IPCClient(ipc)
}

/**
 * Factory function for creating IPC server instance
 *
 * @param ipc - node-ipc instance
 * @returns IPCServer wrapper
 */
export function createIPCServer(ipc: typeof Ipc): IPCServer {
  return new IPCServer(ipc)
}
