import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface SandboxResult {
  stdout: string
  stderr: string
  return_value: any
  error: string | null
}

export async function executePythonCode(code: string): Promise<SandboxResult> {
  try {
    // Execute Python sandbox script
    const { stdout, stderr } = await execAsync(`python3 scripts/python_sandbox.py`, {
      input: code,
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
