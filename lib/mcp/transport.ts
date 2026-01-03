import { ChildProcess } from "child_process"
import { spawn } from "child_process"
import { Readable, Writable } from "stream"

export type TransportType = "stdio" | "http"

export interface MCPServerInstance {
  id: string
  transport_type: TransportType
  process?: ChildProcess
  port?: number
  url?: string
}

/**
 * Base transport interface for MCP communication
 */
export interface MCPTransport {
  send(method: string, params?: any): Promise<any>
  close(): Promise<void>
  isConnected(): boolean
}

/**
 * stdio transport - communicates with MCP server via stdin/stdout
 */
export class StdioTransport implements MCPTransport {
  private process: ChildProcess
  private requestId = 0
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>()
  private buffer = ""
  private logCallback?: (line: string, level: "stdout" | "stderr") => void

  constructor(
    command: string,
    args: string[] = [],
    env?: NodeJS.ProcessEnv,
    logCallback?: (line: string, level: "stdout" | "stderr") => void
  ) {
    this.logCallback = logCallback
    this.process = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    })

    // Handle stdout (responses from MCP server)
    this.process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString()
      this.logCallback?.(text, "stdout")
      this.buffer += text
      this.processBuffer()
    })

    // Handle stderr (errors/logs)
    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString()
      this.logCallback?.(text, "stderr")
      console.error("[MCP Server stderr]:", text)
    })

    // Handle process exit
    this.process.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[MCP Server] Process exited with code ${code}`)
        this.rejectAllPending(new Error(`Process exited with code ${code}`))
      }
    })

    // Handle process errors
    this.process.on("error", (error) => {
      console.error("[MCP Server] Process error:", error)
      this.rejectAllPending(error)
    })
  }

  private processBuffer() {
    // MCP uses JSON-RPC over newline-delimited JSON
    const lines = this.buffer.split("\n")
    this.buffer = lines.pop() || "" // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const message = JSON.parse(line)
        this.handleMessage(message)
      } catch (error) {
        console.error("[MCP Transport] Failed to parse message:", line, error)
      }
    }
  }

  private handleMessage(message: any) {
    // Handle JSON-RPC response
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)

      if (message.error) {
        reject(new Error(message.error.message || "MCP server error"))
      } else {
        resolve(message.result)
      }
    }
  }

  async send(method: string, params?: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error("Transport not connected")
    }

    const id = ++this.requestId
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params: params || {},
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      // Send request to stdin
      const requestJson = JSON.stringify(request) + "\n"
      this.process.stdin?.write(requestJson, (error) => {
        if (error) {
          this.pendingRequests.delete(id)
          reject(error)
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error("Request timeout"))
        }
      }, 30000)
    })
  }

  async close(): Promise<void> {
    this.rejectAllPending(new Error("Transport closed"))
    if (this.process && !this.process.killed && this.process.exitCode === null) {
      console.log(`[StdioTransport] Killing process ${this.process.pid}`)
      const platform = process.platform
      
      if (platform === "win32") {
        // Windows: use kill() without signal (sends SIGKILL equivalent)
        this.process.kill()
      } else {
        // Unix: try SIGTERM first, then SIGKILL
        this.process.kill('SIGTERM')
        // Give it a moment to gracefully shutdown
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Force kill if still running
        if (this.process && !this.process.killed && this.process.exitCode === null) {
          console.log(`[StdioTransport] Force killing process ${this.process.pid}`)
          this.process.kill('SIGKILL')
        }
      }
      
      // Wait a bit to ensure process is killed
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  isConnected(): boolean {
    return this.process !== undefined && !this.process.killed && this.process.exitCode === null
  }

  private rejectAllPending(error: Error) {
    for (const { reject } of this.pendingRequests.values()) {
      reject(error)
    }
    this.pendingRequests.clear()
  }

  getProcess(): ChildProcess {
    return this.process
  }
}

/**
 * HTTP transport - communicates with MCP server via HTTP POST
 */
export class HttpTransport implements MCPTransport {
  private url: string
  private timeout: number

  constructor(url: string, timeout: number = 30000) {
    this.url = url
    this.timeout = timeout
  }

  async send(method: string, params?: any): Promise<any> {
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params: params || {},
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || "MCP server error")
      }

      return data.result
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout")
      }
      throw error
    }
  }

  async close(): Promise<void> {
    // HTTP transport doesn't need cleanup
  }

  isConnected(): boolean {
    return true // HTTP is always "connected"
  }
}
