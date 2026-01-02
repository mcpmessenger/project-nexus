"""
Nexus SDK - Python wrapper for Project Nexus MCP integration
"""

from .google import GoogleSDK, GoogleWorkspace

__all__ = ['GoogleSDK', 'GoogleWorkspace', 'google']

# Create a singleton instance for convenience
# Using GoogleSDK as the primary class
google = GoogleSDK()
