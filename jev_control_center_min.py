#!/usr/bin/env python
# -*- coding: utf-8 -*-

import http.server
import socketserver
import json
import time

# 配置
PORT = 1821

class ControlCenterHandler(http.server.BaseHTTPRequestHandler):
    # 处理GET请求
    def do_GET(self):
        try:
            # 处理健康检查端点
            if self.path == '/ping':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    "status": "ok",
                    "message": "Control Center is running",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "port": PORT
                }
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"[INFO] Ping request received and responded")
                
            # 状态信息端点
            elif self.path == '/status':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    "service": "JEV Control Center",
                    "status": "running",
                    "port": PORT,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"[INFO] Status request received and responded")
            
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {"error": "Not found"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {"error": str(e)}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            print(f"[ERROR] Error handling GET request: {e}")
    
    # 处理OPTIONS请求（CORS预检）
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Key')
        self.end_headers()
        print(f"[INFO] OPTIONS request handled")
    
    # 静默日志记录
    def log_message(self, format, *args):
        return

# 启动服务器
def start_server():
    try:
        # 创建服务器
        with socketserver.ThreadingTCPServer(("", PORT), ControlCenterHandler) as httpd:
            print(f"✅ JEV Control Center running on port {PORT}")
            print(f"✅ Health check available at: http://localhost:{PORT}/ping")
            # 持续运行服务器
            httpd.serve_forever()
    
    except KeyboardInterrupt:
        print("\n[INFO] Control Center shutting down...")
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")

if __name__ == "__main__":
    start_server()