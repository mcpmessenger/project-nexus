import sys
import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr
from typing import Any, Dict

def execute_code(code: str) -> Dict[str, Any]:
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
        # Redirect stdout and stderr
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            # Create a restricted namespace
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
    
    # Execute and return result
    execution_result = execute_code(code_input)
    
    # Print result as JSON
    print(json.dumps(execution_result))
