import { spawn, ChildProcess } from "child_process"

export interface SandboxResult {
  stdout: string
  stderr: string
  return_value: any
  error: string | null
}

export async function executePythonCode(
  code: string,
  options?: {
    nexus_api_url?: string
    server_instance_id?: string
    nexus_auth_token?: string
    env?: Record<string, string>
  }
): Promise<SandboxResult> {
  try {
    // Prepare input data
    const inputData: any = { code }
    if (options?.nexus_api_url) {
      inputData.nexus_api_url = options.nexus_api_url
    }
    if (options?.server_instance_id) {
      inputData.server_instance_id = options.server_instance_id
    }
    if (options?.nexus_auth_token) {
      inputData.nexus_auth_token = options.nexus_auth_token
    }

    const input = JSON.stringify(inputData)

    const execEnv = {
      ...process.env,
      ...options?.env,
    }

    // Determine Python command (Windows uses 'py', Unix uses 'python3')
    // On Windows, use full path to py.exe to avoid PATH issues
    let pythonCmd: string
    if (process.platform === 'win32') {
      // Use full path to Python launcher (usually in C:\WINDOWS\py.exe)
      pythonCmd = process.env.WINDIR ? `${process.env.WINDIR}\\py.exe` : 'C:\\WINDOWS\\py.exe'
    } else {
      pythonCmd = 'python3'
    }

    // Execute Python sandbox script using spawn (supports stdin/stdout pipes)
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child: ChildProcess = spawn(pythonCmd, ['scripts/python_sandbox.py'], {
        env: execEnv,
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdoutData = ''
      let stderrData = ''

      child.stdout?.on('data', (data: Buffer) => {
        stdoutData += data.toString()
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderrData += data.toString()
      })

      child.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        child.kill()
        reject(new Error('Execution timeout after 30 seconds'))
      }, 30000)

      child.on('exit', (code) => {
        clearTimeout(timeout)
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${stderrData || stdoutData}`))
        } else {
          resolve({ stdout: stdoutData, stderr: stderrData })
        }
      })

      // Write input to stdin and close it
      if (child.stdin) {
        child.stdin.write(input)
        child.stdin.end()
      } else {
        reject(new Error('Failed to open stdin'))
      }
    })

    // Parse the JSON result from Python script
    try {
      const result = JSON.parse(stdout)
      return result
    } catch (parseError) {
      return {
        stdout: stdout,
        stderr: stderr,
        return_value: null,
        error: "Failed to parse sandbox output",
      }
    }
  } catch (error: any) {
    console.error("[Sandbox] Python execution error:", error)
    console.error("[Sandbox] Error details:", {
      message: error.message,
      stderr: error.stderr,
      stdout: error.stdout,
      code: error.code,
      signal: error.signal,
    })
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      return_value: null,
      error: error.message || "Execution failed",
    }
  }
}
