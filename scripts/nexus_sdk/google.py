"""
Google Workspace SDK for Project Nexus
Provides a simple Python API for interacting with Google Workspace services via MCP

This SDK wraps MCP calls and handles data processing locally in the sandbox,
following the "Nexus way" of keeping heavy data processing away from the LLM context.
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


class NexusAPIError(Exception):
    """Base exception for Nexus API errors"""
    pass


class MCPCallError(NexusAPIError):
    """Exception raised when MCP call fails"""
    pass


class Gmail:
    """
    Gmail service client
    
    Provides methods to interact with Gmail through the MCP proxy.
    Processing happens locally in the sandbox to save tokens.
    """
    
    def __init__(self, parent):
        self._parent = parent
    
    def search(self, query: str, limit: int = 10):
        """
        Searches Gmail and returns structured results.
        
        The MCP call happens here, but results are processed LOCALLY
        in the sandbox before being returned. This saves tokens by
        filtering/summarizing data before the LLM sees it.
        
        Args:
            query: Gmail search query string
            limit: Maximum number of results to return (processed locally)
            
        Returns:
            List of message objects with id, snippet, and from fields
        """
        # The MCP call happens here
        raw_results = self._parent._call_mcp("gmail_search", {"query": query})
        
        # Logic is handled LOCALLY in the sandbox
        # We can pre-process/summarize here before the LLM sees it
        if not raw_results:
            return []
        
        # Ensure we have a list
        if not isinstance(raw_results, list):
            raw_results = [raw_results]
        
        # Process and limit results locally (saves tokens)
        processed = []
        for m in raw_results[:limit]:
            # Extract relevant fields - processing happens in sandbox, not LLM context
            msg = {
                "id": m.get("id", ""),
                "snippet": m.get("snippet", ""),
                "from": m.get("from", "")
            }
            processed.append(msg)
        
        return processed
    
    def list_messages(self, query=None, max_results=50):
        """
        List Gmail messages
        
        Args:
            query: Gmail search query (optional)
            max_results: Maximum number of results
            
        Returns:
            List of message objects
        """
        params = {"max_results": max_results}
        if query:
            params["query"] = query
        return self._parent._call_mcp("gmail_list_messages", params)
    
    def get_message(self, message_id):
        """
        Get message by ID
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            Message object
        """
        return self._parent._call_mcp("gmail_get_message", {
            "message_id": message_id
        })


class Calendar:
    """
    Google Calendar service client
    
    Provides methods to interact with Google Calendar through the MCP proxy.
    """
    
    def __init__(self, parent):
        self._parent = parent
    
    def list_events(self, calendar_id="primary", time_min=None):
        """
        List calendar events
        
        Args:
            calendar_id: Calendar ID (defaults to "primary")
            time_min: Minimum time for events (ISO format string)
            
        Returns:
            List of event objects
        """
        params = {
            "calendarId": calendar_id
        }
        if time_min:
            params["timeMin"] = time_min
        
        return self._parent._call_mcp("calendar_list_events", params)
    
    def get_event(self, event_id, calendar_id="primary"):
        """
        Get event by ID
        
        Args:
            event_id: Calendar event ID
            calendar_id: Calendar ID (defaults to "primary")
            
        Returns:
            Event object
        """
        return self._parent._call_mcp("calendar_get_event", {
            "event_id": event_id,
            "calendarId": calendar_id
        })
    
    def create_event(self, summary, start_time, end_time, calendar_id="primary", description=None, location=None):
        """
        Create a calendar event
        
        Args:
            summary: Event title
            start_time: Start time (ISO format)
            end_time: End time (ISO format)
            calendar_id: Calendar ID (defaults to "primary")
            description: Optional event description
            location: Optional event location
            
        Returns:
            Created event object
        """
        params = {
            "summary": summary,
            "start_time": start_time,
            "end_time": end_time,
            "calendarId": calendar_id
        }
        if description:
            params["description"] = description
        if location:
            params["location"] = location
        return self._parent._call_mcp("calendar_create_event", params)


class GoogleSDK:
    """
    Google Workspace SDK client
    
    Provides a clean Python API for interacting with Google Workspace services
    through the Project Nexus MCP proxy. This wrapper translates simple Python
    calls into the mcp.call() format required to communicate with the 
    google-workspace-mcp server (specifically the version by taylorwilsdon).
    
    Usage:
        from nexus_sdk import google
        
        # Search Gmail (processing happens in sandbox)
        emails = google.gmail.search("Project Nexus", limit=10)
        
        # List calendar events
        events = google.calendar.list_events(calendar_id="primary", time_min="2024-01-01T00:00:00Z")
    """
    
    def __init__(self, base_url=None, server_instance_id=None):
        """
        Initialize Google Workspace SDK client
        
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
        
        # Initialize service clients
        self.gmail = Gmail(self)
        self.calendar = Calendar(self)
    
    def _call_mcp(self, method, params=None):
        """
        Make an MCP call through the Nexus proxy
        
        Args:
            method: MCP method name (e.g., "gmail_search", "calendar_list_events")
            params: Method parameters
            
        Returns:
            Result from MCP call
        """
        url = f"{self.base_url}/api/mcp/call"
        payload = {
            "server_instance_id": self.server_instance_id,
            "method": method,
            "params": params or {}
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
            
            return data.get('result')
        except Exception as e:
            if isinstance(e, MCPCallError):
                raise
            raise MCPCallError(f"Failed to call MCP: {str(e)}")


# Alias for backward compatibility
GoogleWorkspace = GoogleSDK
