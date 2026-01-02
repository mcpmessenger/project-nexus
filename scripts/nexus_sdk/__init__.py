"""
Nexus SDK - Python wrapper for Project Nexus MCP integration
"""

from .google import GoogleSDK, GoogleWorkspace
from .mcp import MCP, get_mcp, call as mcp_call

__all__ = ['GoogleSDK', 'GoogleWorkspace', 'google', 'MCP', 'get_mcp', 'mcp_call']

# Create a singleton instance for convenience
# Using GoogleSDK as the primary class
google = GoogleSDK()

# Create MCP singleton instance (lazy initialization)
mcp = None

def get_mcp_instance():
    """Get or create the MCP singleton instance"""
    global mcp
    if mcp is None:
        mcp = get_mcp()
    return mcp
