"""
Google Workspace SDK for Project Nexus
Provides a simple Python API for interacting with Google Workspace services via MCP
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


class GoogleWorkspace:
    """
    Google Workspace SDK client
    
    Provides methods to interact with Google Drive, Calendar, and Gmail
    through the Project Nexus MCP proxy.
    """
    
    def __init__(self, base_url=None, server_instance_id=None):
        """
        Initialize Google Workspace client
        
        Args:
            base_url: Base URL for Nexus API (defaults to environment variable or localhost)
            server_instance_id: MCP server instance ID (defaults to environment variable)
        """
        self.base_url = base_url or os.environ.get('NEXUS_API_URL', 'http://localhost:3000')
        self.server_instance_id = server_instance_id or os.environ.get('NEXUS_SERVER_INSTANCE_ID')
        
        if not self.server_instance_id:
            raise ValueError("server_instance_id must be provided or set in NEXUS_SERVER_INSTANCE_ID environment variable")
    
    def _call_mcp(self, method, params=None):
        """
        Make an MCP call through the Nexus proxy
        
        Args:
            method: MCP method name
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
    
    # Drive methods
    class Drive:
        def __init__(self, parent):
            self._parent = parent
        
        def search(self, query, max_results=10):
            """
            Search for files in Google Drive
            
            Args:
                query: Search query string
                max_results: Maximum number of results to return
                
            Returns:
                List of file objects
            """
            return self._parent._call_mcp("google_drive_search", {
                "query": query,
                "max_results": max_results
            })
        
        def get_file(self, file_id):
            """
            Get file metadata by ID
            
            Args:
                file_id: Google Drive file ID
                
            Returns:
                File metadata object
            """
            return self._parent._call_mcp("google_drive_get_file", {
                "file_id": file_id
            })
        
        def list_files(self, folder_id=None, max_results=50):
            """
            List files in Google Drive
            
            Args:
                folder_id: Optional folder ID to list files from
                max_results: Maximum number of results
                
            Returns:
                List of file objects
            """
            params = {"max_results": max_results}
            if folder_id:
                params["folder_id"] = folder_id
            return self._parent._call_mcp("google_drive_list_files", params)
        
        def create_file(self, name, content=None, mime_type="text/plain", folder_id=None):
            """
            Create a new file in Google Drive
            
            Args:
                name: File name
                content: File content (optional)
                mime_type: MIME type of the file
                folder_id: Optional folder ID to create file in
                
            Returns:
                Created file object
            """
            params = {
                "name": name,
                "mime_type": mime_type
            }
            if content:
                params["content"] = content
            if folder_id:
                params["folder_id"] = folder_id
            return self._parent._call_mcp("google_drive_create_file", params)
    
    # Calendar methods
    class Calendar:
        def __init__(self, parent):
            self._parent = parent
        
        def list_events(self, start_date=None, end_date=None, max_results=50):
            """
            List calendar events
            
            Args:
                start_date: Start date (ISO format or YYYY-MM-DD)
                end_date: End date (ISO format or YYYY-MM-DD)
                max_results: Maximum number of results
                
            Returns:
                List of event objects
            """
            params = {"max_results": max_results}
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            return self._parent._call_mcp("google_calendar_list_events", params)
        
        def get_event(self, event_id):
            """
            Get event by ID
            
            Args:
                event_id: Calendar event ID
                
            Returns:
                Event object
            """
            return self._parent._call_mcp("google_calendar_get_event", {
                "event_id": event_id
            })
        
        def create_event(self, summary, start_time, end_time, description=None, location=None):
            """
            Create a calendar event
            
            Args:
                summary: Event title
                start_time: Start time (ISO format)
                end_time: End time (ISO format)
                description: Optional event description
                location: Optional event location
                
            Returns:
                Created event object
            """
            params = {
                "summary": summary,
                "start_time": start_time,
                "end_time": end_time
            }
            if description:
                params["description"] = description
            if location:
                params["location"] = location
            return self._parent._call_mcp("google_calendar_create_event", params)
    
    # Gmail methods
    class Gmail:
        def __init__(self, parent):
            self._parent = parent
        
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
            return self._parent._call_mcp("google_gmail_list_messages", params)
        
        def get_message(self, message_id):
            """
            Get message by ID
            
            Args:
                message_id: Gmail message ID
                
            Returns:
                Message object
            """
            return self._parent._call_mcp("google_gmail_get_message", {
                "message_id": message_id
            })
        
        def send(self, to, subject, body, cc=None, bcc=None):
            """
            Send an email via Gmail
            
            Args:
                to: Recipient email address(es) - string or list
                subject: Email subject
                body: Email body (plain text)
                cc: CC recipients (optional)
                bcc: BCC recipients (optional)
                
            Returns:
                Sent message object
            """
            params = {
                "to": to if isinstance(to, list) else [to],
                "subject": subject,
                "body": body
            }
            if cc:
                params["cc"] = cc if isinstance(cc, list) else [cc]
            if bcc:
                params["bcc"] = bcc if isinstance(bcc, list) else [bcc]
            return self._parent._call_mcp("google_gmail_send", params)
    
    def __init__(self, base_url=None, server_instance_id=None):
        """Initialize Google Workspace client"""
        self.base_url = base_url or os.environ.get('NEXUS_API_URL', 'http://localhost:3000')
        self.server_instance_id = server_instance_id or os.environ.get('NEXUS_SERVER_INSTANCE_ID')
        
        if not self.server_instance_id:
            raise ValueError("server_instance_id must be provided or set in NEXUS_SERVER_INSTANCE_ID environment variable")
        
        # Initialize service clients
        self.drive = self.Drive(self)
        self.calendar = self.Calendar(self)
        self.gmail = self.Gmail(self)
    
    def _call_mcp(self, method, params=None):
        """Make an MCP call through the Nexus proxy"""
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
