"""
Nexus SDK - Python wrapper for Project Nexus MCP integration
"""

from .google import GoogleWorkspace

__all__ = ['GoogleWorkspace', 'google']

# Create a singleton instance for convenience
google = GoogleWorkspace()
