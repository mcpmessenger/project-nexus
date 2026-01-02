import sys
import json
import io
import os
import traceback
from contextlib import redirect_stdout, redirect_stderr
from typing import Any, Dict

def execute_code(code: str, nexus_api_url: str = None, server_instance_id: str = None) -> Dict[str, Any]:
    """
    Execute Python code in a controlled sandbox environment.
    
    Returns:
        Dict with stdout, stderr, return_value, and error (if any)
    """
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    result = {
        "stdout": "",
        "stderr": "",
        "return_value": None,
        "error": None
    }
    
    try:
        # Set up environment variables for Nexus SDK
        if nexus_api_url:
            os.environ["NEXUS_API_URL"] = nexus_api_url
        if server_instance_id:
            os.environ["NEXUS_SERVER_INSTANCE_ID"] = server_instance_id
        
        # Add nexus_sdk to Python path
        scripts_dir = os.path.dirname(os.path.abspath(__file__))
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        
        # Redirect stdout and stderr
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            # Import nexus_sdk if available
            try:
                import nexus_sdk
                namespace = {
                    "__builtins__": {
                        "print": print,
                        "len": len,
                        "range": range,
                        "str": str,
                        "int": int,
                        "float": float,
                        "bool": bool,
                        "list": list,
                        "dict": dict,
                        "tuple": tuple,
                        "set": set,
                        "True": True,
                        "False": False,
                        "None": None,
                    },
                    "json": json,
                    "nexus_sdk": nexus_sdk,
                    "google": nexus_sdk.google,
                }
            except ImportError:
                # Fallback if nexus_sdk not available
                namespace = {
                    "__builtins__": {
                        "print": print,
                        "len": len,
                        "range": range,
                        "str": str,
                        "int": int,
                        "float": float,
                        "bool": bool,
                        "list": list,
                        "dict": dict,
                        "tuple": tuple,
                        "set": set,
                        "True": True,
                        "False": False,
                        "None": None,
                    },
                    "json": json,
                }
            
            # Execute the code
            exec(code, namespace)
            
            # Capture return value if there's a main() function
            if "main" in namespace and callable(namespace["main"]):
                result["return_value"] = namespace["main"]()
        
        result["stdout"] = stdout_buffer.getvalue()
        result["stderr"] = stderr_buffer.getvalue()
        
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["stderr"] = traceback.format_exc()
    
    return result

if __name__ == "__main__":
    # Read code from stdin
    code_input = sys.stdin.read()
    
    # Read environment variables from stdin if provided as JSON
    # Format: {"code": "...", "nexus_api_url": "...", "server_instance_id": "..."}
    nexus_api_url = None
    server_instance_id = None
    
    try:
        # Try to parse as JSON first (new format)
        data = json.loads(code_input)
        code_input = data.get("code", code_input)
        nexus_api_url = data.get("nexus_api_url")
        server_instance_id = data.get("server_instance_id")
    except (json.JSONDecodeError, ValueError):
        # Fallback to plain code (old format)
        pass
    
    # Execute and return result
    execution_result = execute_code(code_input, nexus_api_url, server_instance_id)
    
    # Print result as JSON
    print(json.dumps(execution_result))
