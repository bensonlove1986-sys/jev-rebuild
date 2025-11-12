# Simple HTTP server to test JEV panel connectivity
# Run with: python start_je_vserver.py

import http.server
import socketserver
import json
from datetime import datetime

PORT = 1820

class MyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ping":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "agent_ok": True,
                "port": PORT,
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path == "/status":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "status": "online",
                "agent": {
                    "agentRunning": True,
                    "workerStatus": "connected",
                    "version": "2.0",
                    "uptime": 0,
                    "lastHeartbeat": datetime.now().isoformat()
                },
                "worker": {
                    "connected": True,
                    "mode": "local",
                    "latency": 42
                },
                "jev": {
                    "mode": "root",
                    "path": "D:/JEV",
                    "version": "2.0"
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"JEV Test Server running on port {PORT}")
    print("Available endpoints:")
    print(f"  GET http://localhost:{PORT}/ping")
    print(f"  GET http://localhost:{PORT}/status")
    print("\nJEV Panel should now show as \"Connected\" when refreshed.")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()