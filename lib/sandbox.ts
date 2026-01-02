import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

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

    const input = JSON.stringify(inputData)

    // Execute Python sandbox script
    const { stdout, stderr } = await execAsync(`python3 scripts/python_sandbox.py`, {
      input,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
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
    return {
      stdout: "",
      stderr: error.stderr || "",
      return_value: null,
      error: error.message || "Execution failed",
    }
  }
}
