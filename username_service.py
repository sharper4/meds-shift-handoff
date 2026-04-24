#!/usr/bin/env python3
"""
Simple Flask service to provide Windows username to the MEDS Shift Handoff app.
Run this in the background: python username_service.py
"""

import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

def get_username():
    """Get the current Windows username."""
    return os.getenv('USERNAME', 'Unknown')

class UsernameHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/username':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = json.dumps({'username': get_username()})
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

if __name__ == '__main__':
    server = HTTPServer(('localhost', 5000), UsernameHandler)
    print('Username service running on http://localhost:5000')
    print(f'Current user: {get_username()}')
    print('Press Ctrl+C to stop.')
    server.serve_forever()
