#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
import time
import json
import http.server
import socketserver
import urllib.parse

# 配置文件路径
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'jev_memory_config.json')

# 默认配置
DEFAULT_CONFIG = {
    "paths": {
        "mainScript": "D:\\PDF转网页\\desktopAgent.ps1",
        "startScript": "D:\\PDF转网页\\start_jev_system.ps1",
        "startSimple": "D:\\PDF转网页\\start_jev_simple.ps1",
        "heartbeat": "D:\\PDF转网页\\central_heartbeat_watchdog.ps1",
        "controlPanel": "D:\\PDF转网页\\scripts\\modular\\control_panel.html",
        "logsDir": "D:\\PDF转网页\\Logs\\",
        "autostart": "D:\\PDF转网页\\jev_autostart.ps1",
        "aiService": "D:\\PDF转网页\\jev_ai_service.py"
    },
    "ports": {
        "agent": 1820,
        "controlPanel": 1819,
        "internal": 1821,
        "fallback": 1822
    }
}

def check_file_exists(file_path):
    """检查文件是否存在"""
    return os.path.exists(file_path)

def check_port_available(port):
    """检查端口是否可用"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) != 0

def load_config():
    """加载配置文件"""
    if check_file_exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"配置文件加载失败，使用默认配置: {e}")
            return DEFAULT_CONFIG
    else:
        return DEFAULT_CONFIG

def save_config(config):
    """保存配置到文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存配置失败: {e}")
        return False

def command_check_paths():
    """检查系统路径命令 - 调用 jev_autostart.ps1"""
    try:
        config = load_config()
        autostart_path = config["paths"].get("autostart", "D:\\PDF转网页\\jev_autostart.ps1")
        
        if check_file_exists(autostart_path):
            # 构建命令
            cmd = [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                autostart_path,
                "check"
            ]
            
            # 执行命令并获取输出
            result = subprocess.run(cmd, cwd="D:\\PDF转网页", capture_output=True, text=True, encoding='utf-8')
            
            if result.returncode == 0:
                return True, "系统路径检查成功", result.stdout
            else:
                return False, "系统路径检查失败", result.stderr
        else:
            return False, "jev_autostart.ps1 不存在", ""
    except Exception as e:
        return False, f"执行检查时出错", str(e)

def command_start_system():
    """启动JEV系统命令 - 调用 desktopAgent.ps1"""
    try:
        config = load_config()
        agent_path = config["paths"].get("mainScript", "D:\\PDF转网页\\desktopAgent.ps1")
        
        if check_file_exists(agent_path):
            # 检查端口1820
            port = 1820
            if not check_port_available(port):
                return False, "系统启动失败", f"端口 {port} 已被占用"
            
            # 启动agent
            # 构建命令
            cmd = [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                agent_path
            ]
            
            # 启动进程
            subprocess.Popen(cmd, cwd="D:\\PDF转网页")
            
            # 等待一会儿
            time.sleep(1)
            
            # 更新状态到配置文件
            config = load_config()
            config["status"] = {
                "isRunning": True,
                "lastHeartbeat": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            save_config(config)
            
            return True, "系统启动成功", "系统已在端口1820启动"
        else:
            return False, "系统启动失败", f"Agent脚本不存在于 {agent_path}"
    except Exception as e:
        return False, "系统启动失败", str(e)

def command_translate_text(text_content):
    """翻译文本命令 - 调用 jev_ai_service.py"""
    try:
        config = load_config()
        ai_service_path = config["paths"].get("aiService", "D:\\PDF转网页\\jev_ai_service.py")
        
        if check_file_exists(ai_service_path):
            # 构建命令
            cmd = [
                "python",
                ai_service_path,
                "translate",
                text_content
            ]
            
            # 执行命令并获取输出
            result = subprocess.run(cmd, cwd="D:\\PDF转网页", capture_output=True, text=True, encoding='utf-8')
            
            if result.returncode == 0:
                return True, "翻译成功", result.stdout.strip()
            else:
                return False, "翻译失败", result.stderr
        else:
            return False, "jev_ai_service.py 不存在", ""
    except Exception as e:
        return False, "执行翻译时出错", str(e)

def command_ocr_image(image_path):
    """识别图片命令 - 调用 jev_ai_service.py OCR"""
    try:
        config = load_config()
        ai_service_path = config["paths"].get("aiService", "D:\\PDF转网页\\jev_ai_service.py")
        
        if not check_file_exists(image_path):
            return False, "图片识别失败", f"图片文件不存在: {image_path}"
        
        if check_file_exists(ai_service_path):
            # 构建命令
            cmd = [
                "python",
                ai_service_path,
                "ocr",
                image_path
            ]
            
            # 执行命令并获取输出
            result = subprocess.run(cmd, cwd="D:\\PDF转网页", capture_output=True, text=True, encoding='utf-8')
            
            if result.returncode == 0:
                return True, "图片识别成功", result.stdout.strip()
            else:
                return False, "图片识别失败", result.stderr
        else:
            return False, "jev_ai_service.py 不存在", ""
    except Exception as e:
        return False, "执行图片识别时出错", str(e)

def command_reset_system():
    """重建系统命令"""
    print("=== 重建系统 ===")
    
    # 删除配置文件
    if check_file_exists(CONFIG_FILE):
        try:
            os.remove(CONFIG_FILE)
            print("配置文件已重置")
        except Exception as e:
            print(f"删除配置文件失败: {e}")
    
    # 重新初始化
    init_path = "D:\\PDF转网页\\jev_semi_locked_mode_en.ps1"
    if check_file_exists(init_path):
        print("正在重新初始化系统...")
        
        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            init_path
        ]
        
        try:
            subprocess.Popen(cmd, cwd="D:\\PDF转网页")
            print("系统重新初始化完成")
        except Exception as e:
            print(f"重新初始化失败: {e}")
    
    print("重建操作完成")

class CommandHandler(http.server.BaseHTTPRequestHandler):
    """HTTP请求处理器"""
    
    def do_POST(self):
        """处理POST请求"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # 解析请求体
        try:
            data = json.loads(post_data.decode('utf-8'))
            command = data.get('command', '')
            
            # 处理命令
            result = self.handle_command(command)
            
            # 返回统一格式的响应
            response = json.dumps(result, ensure_ascii=False)
            
            # 发送响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            # 错误响应
            error_response = json.dumps({
                "command": "",
                "status": "error",
                "result": str(e),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }, ensure_ascii=False)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_response.encode('utf-8'))
    
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def handle_command(self, command):
        """处理命令并返回统一格式的结果"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 检查系统路径
        if "检查系统路径" in command:
            success, message, result = command_check_paths()
            return {
                "command": "检查系统路径",
                "status": "success" if success else "error",
                "result": result if result else message,
                "timestamp": timestamp
            }
        
        # 启动系统
        elif "启动系统" in command:
            success, message, result = command_start_system()
            return {
                "command": "启动系统",
                "status": "success" if success else "error",
                "result": result if result else message,
                "timestamp": timestamp
            }
        
        # 翻译文本
        elif command.startswith("翻译文本 "):
            text_content = command[5:].strip()  # 去掉"翻译文本 "前缀
            success, message, result = command_translate_text(text_content)
            return {
                "command": f"翻译文本 {text_content}",
                "status": "success" if success else "error",
                "result": result if result else message,
                "timestamp": timestamp
            }
        
        # 识别图片
        elif command.startswith("识别图片 "):
            image_path = command[5:].strip()  # 去掉"识别图片 "前缀
            success, message, result = command_ocr_image(image_path)
            return {
                "command": f"识别图片 {image_path}",
                "status": "success" if success else "error",
                "result": result if result else message,
                "timestamp": timestamp
            }
        
        # 重建系统
        elif "重建系统" in command:
            try:
                command_reset_system()
                return {
                    "command": "重建系统",
                    "status": "success",
                    "result": "系统重建完成",
                    "timestamp": timestamp
                }
            except Exception as e:
                return {
                    "command": "重建系统",
                    "status": "error",
                    "result": str(e),
                    "timestamp": timestamp
                }
        
        # 未知命令
        else:
            return {
                "command": command,
                "status": "error",
                "result": "未知命令",
                "timestamp": timestamp
            }

def start_http_server(port):
    """启动HTTP服务器"""
    with socketserver.TCPServer(("localhost", port), CommandHandler) as httpd:
        print(f"✅ JEV Command Center listening on port {port}")
        httpd.serve_forever()

def handle_cli_command():
    """处理命令行命令"""
    if len(sys.argv) > 1:
        # 获取命令
        command = ' '.join(sys.argv[1:])
        
        # 创建处理器实例来处理命令
        handler = CommandHandler(None, None, None)
        result = handler.handle_command(command)
        
        # 打印结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        show_help()

def show_help():
    """显示帮助信息"""
    print("JEV 命令中心")
    print("可用命令:")
    print("  检查系统路径")
    print("  启动系统")
    print("  翻译文本 [内容]")
    print("  识别图片 [路径]")
    print("  重建系统")
    print("使用方法:")
    print("  作为服务启动: python jev_command_center.py")
    print("  执行命令: python jev_command_center.py [命令]")

def main():
    """主函数"""
    if len(sys.argv) == 1:
        # 作为服务启动
        config = load_config()
        port = config["ports"].get("internal", 1821)
        start_http_server(port)
    else:
        # 处理命令行命令
        handle_cli_command()

if __name__ == "__main__":
    main()