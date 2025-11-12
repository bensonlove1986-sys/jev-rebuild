import http.server
import socketserver
import os
import json
import time
import urllib.parse

# 设置端口和目录
PORT = 1819
DIRECTORY = "d:\\PDF转网页"
JEV_DIAGNOSTICS_DIR = os.path.join(DIRECTORY, "JEV_Client", "diagnostics")

# 创建自定义处理程序，将control_panel.html设为默认页面
class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        # 特殊处理JEV_Client/diagnostics目录下的文件
        if self.path.startswith('/diagnostics/'):
            # 移除开头的/diagnostics/，获取文件名
            file_name = self.path[len('/diagnostics/'):]
            file_path = os.path.join(JEV_DIAGNOSTICS_DIR, file_name)
            
            # 检查文件是否存在
            if os.path.isfile(file_path):
                self.send_response(200)
                # 根据文件扩展名设置Content-Type
                if file_name.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif file_name.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif file_name.endswith('.json'):
                    self.send_header('Content-Type', 'application/json')
                elif file_name.endswith('.log'):
                    self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # 读取并发送文件内容
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'File not found')
                return
        
        # 处理API端点
        if self.path == '/ping':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'status': 'ok',
                'message': 'Worker is running',
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'version': '1.0.0',
                'server': 'JEV Local Server'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'status': 'operational',
                'environment': 'production',
                'services': {
                    'web_server': True,
                    'jev_client': True,
                    'api': True
                },
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'server_port': PORT
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # 如果路径为空或只是根目录，重定向到control_panel.html
        elif self.path == '/' or self.path == '':
            self.path = '/control_panel.html'
        
        return super().do_GET()
    
    # 自定义日志格式
    def log_message(self, format, *args):
        print(f"[HTTP {PORT}] {self.client_address[0]} - {format % args}")

# 设置工作目录
os.chdir(DIRECTORY)

# 启动服务器
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"中控面板服务已启动，监听端口 {PORT}")
    print(f"访问地址: http://localhost:{PORT}/control_panel.html")
    print("✅ JEV 中控与执行系统 (1819) 已成功启动。")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器正在停止...")
        httpd.server_close()