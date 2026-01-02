"""
Generic MCP SDK for Project Nexus
Provides a simple Python API for calling any MCP tool via the Nexus proxy
"""

import json
import os
import sys

# Try to import requests, fallback to urllib if not available
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    try:
        import urllib.request
        import urllib.parse
        import urllib.error
    except ImportError:
        raise ImportError("Either 'requests' or urllib is required for nexus_sdk")


class MCPCallError(Exception):
    """Exception raised when MCP call fails"""
    pass


class MCP:
    """
    Generic MCP client for calling any MCP tool
    
    Usage:
        from nexus_sdk.mcp import mcp
        
        # Call any MCP tool
        result = mcp.call("brave_web_search", {"query": "Python tutorials"})
    """
    
    def __init__(self, base_url=None, server_instance_id=None):
        """
        Initialize MCP client
        
        Args:
            base_url: Base URL for Nexus API (defaults to environment variable or localhost)
            server_instance_id: MCP server instance ID (defaults to environment variable)
        """
        self.base_url = base_url or os.environ.get('NEXUS_API_URL', 'http://localhost:3000')
        self.server_instance_id = server_instance_id or os.environ.get('NEXUS_SERVER_INSTANCE_ID')
        
        if not self.server_instance_id:
            raise ValueError(
                "server_instance_id must be provided or set in NEXUS_SERVER_INSTANCE_ID environment variable"
            )
    
    def call(self, tool_name, params=None):
        """
        Call an MCP tool
        
        Args:
            tool_name: Name of the MCP tool to call
            params: Tool parameters (dict)
            
        Returns:
            Result from the tool call
        """
        url = f"{self.base_url}/api/mcp/call"
        payload = {
            "server_instance_id": self.server_instance_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": params or {}
            }
        }
        
        try:
            if HAS_REQUESTS:
                response = requests.post(url, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()
            else:
                # Fallback to urllib
                req_data = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(url, data=req_data, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    data = json.loads(response.read().decode('utf-8'))
            
            if 'error' in data:
                raise MCPCallError(f"MCP call failed: {data['error']}")
            
            result = data.get('result', {})
            # MCP tools/call returns result with content field
            # Ensure we return a JSON-serializable value
            if isinstance(result, dict):
                # Extract content - could be text or array of content items
                if 'content' in result:
                    content = result['content']
                    if isinstance(content, list) and len(content) > 0:
                        # Extract text from all content items
                        texts = []
                        for item in content:
                            if isinstance(item, dict):
                                # MCP content items can have 'type' and 'text' fields
                                if 'text' in item:
                                    texts.append(item['text'])
                                elif item.get('type') == 'text' and 'text' in item:
                                    texts.append(item['text'])
                                else:
                                    # If no text field, include the whole item as JSON string
                                    try:
                                        texts.append(json.dumps(item))
                                    except:
                                        texts.append(str(item))
                            elif isinstance(item, str):
                                texts.append(item)
                        
                        # Return joined text if multiple items, or single item if one
                        if len(texts) == 1:
                            return texts[0]
                        elif len(texts) > 1:
                            return "\n\n".join(texts)
                        else:
                            # No text found, return the content list as-is (should be serializable)
                            return content
                    elif isinstance(content, str):
                        return content
                # If no content field, return the whole result (should be serializable)
                return result
            # For non-dict results, return as-is (should be serializable)
            return result
        except Exception as e:
            if isinstance(e, MCPCallError):
                raise
            raise MCPCallError(f"Failed to call MCP tool: {str(e)}")


# Create a singleton instance for convenience
_mcp_instance = None

def get_mcp(base_url=None, server_instance_id=None):
    """Get or create the MCP singleton instance"""
    global _mcp_instance
    if _mcp_instance is None:
        _mcp_instance = MCP(base_url, server_instance_id)
    return _mcp_instance

# Convenience function
def call(tool_name, params=None):
    """Convenience function to call an MCP tool"""
    mcp = get_mcp()
    return mcp.call(tool_name, params)
