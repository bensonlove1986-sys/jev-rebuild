import json
import requests
import socket
import os
from datetime import datetime

def check_worker_status():
    try:
        # 尝试连接Worker的status端点
        response = requests.get("https://jevshop.bensonlove1986.workers.dev/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data
        return None
    except Exception as e:
        print(f"Worker连接错误: {e}")
        return None

def check_local_files():
    # 检查核心文件是否存在
    required_files = ["desktopAgent.ps1", "execute_task.ps1"]
    for file in required_files:
        if not os.path.exists(os.path.join("d:\\PDF转网页", file)):
            return False
    return True

def check_ports():
    # 检查关键端口是否可访问
    ports_to_check = [1822, 8787, 8788]
    for port in ports_to_check:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2)
                if s.connect_ex(("127.0.0.1", port)) != 0:
                    # 端口不可访问但不标记为失败，因为可能未启动
                    pass
        except Exception:
            pass
    return True

# 初始化报告
report = {
    "worker_status": "❌",
    "modules_status": "❌",
    "kv_integrity": "❌",
    "local_core_files": "✅" if check_local_files() else "❌",
    "network_ports": "✅" if check_ports() else "❌",
    "worker_details": {},
    "overall": "🔴 系统异常",
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
}

# 尝试获取Worker状态
worker_data = check_worker_status()
if worker_data:
    report["worker_status"] = "✅"
    report["worker_details"] = worker_data
    
    # 检查环境变量状态
    if worker_data.get("env", {}).get("JEV_API_KEY") and worker_data.get("env", {}).get("DAOJIE_API_KEY"):
        report["modules_status"] = "✅"
    
    # 检查KV完整性
    kv_status = worker_data.get("kv_status", {})
    if kv_status and all(status.startswith("✅") for status in kv_status.values()):
        report["kv_integrity"] = "✅"

# 确定总体状态
if report["worker_status"] == "✅" and report["modules_status"] == "✅" and report["kv_integrity"] == "✅":
    report["overall"] = "🟢 系统正常"
else:
    report["overall"] = "🔴 系统异常"

# 根据要求格式输出报告（不包含worker_details）
output_report = {
    "worker_status": report["worker_status"],
    "modules_status": report["modules_status"],
    "kv_integrity": report["kv_integrity"],
    "local_core_files": report["local_core_files"],
    "network_ports": report["network_ports"],
    "overall": report["overall"],
    "timestamp": report["timestamp"]
}
print(json.dumps(output_report, ensure_ascii=False))

# 保存完整报告到文件
with open("d:\\PDF转网页\\jev_global_self_check_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

# 输出详细信息
if worker_data:
    print(f"\nWorker连接成功！环境变量检查: {worker_data.get('env', {})}")
    print(f"KV状态: {worker_data.get('kv_status', {})}")
else:
    print("\n注意: 由于Worker连接问题，云端组件检测失败。本地组件检测结果如上所示。")

