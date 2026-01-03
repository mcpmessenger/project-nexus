"""
Nexus SDK - Python wrapper for Project Nexus MCP integration
"""

from .google import GoogleSDK, GoogleWorkspace
from .mcp import MCP, get_mcp, call as mcp_call

__all__ = ['GoogleSDK', 'GoogleWorkspace', 'google', 'MCP', 'get_mcp', 'mcp_call']

# Create singleton instances (lazy initialization to avoid requiring server_instance_id at import time)
_google_instance = None
mcp = None

def get_google_instance():
    """Get or create the GoogleSDK singleton instance (lazy initialization)"""
    global _google_instance
    if _google_instance is None:
        _google_instance = GoogleSDK()
    return _google_instance

# Create a property-like accessor for backward compatibility
class _GoogleProxy:
    """Proxy class to provide lazy access to GoogleSDK instance"""
    def __getattr__(self, name):
        return getattr(get_google_instance(), name)

google = _GoogleProxy()

def get_mcp_instance():
    """Get or create the MCP singleton instance"""
    global mcp
    if mcp is None:
        mcp = get_mcp()
    return mcp
