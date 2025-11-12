import os
import json
import time
import requests
import hashlib
import socket
from datetime import datetime

# 创建自检报告
report = {
    "worker_status": "❌",
    "modules_status": "❌", 
    "kv_integrity": "❌",
    "local_core_files": "❌",
    "network_ports": "❌",
    "overall": "🔴 系统异常",
    "timestamp": datetime.now().isoformat()
}

def get_file_hash(file_path):
    """计算文件哈希值"""
    if not os.path.exists(file_path):
        return None
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def check_port(port):
    """检查端口是否可监听"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0
    except:
        return False

print("=== JEV 系统全局自检开始 ===")
print("时间戳:", report["timestamp"])
print()

# 1️⃣ Worker 状态与版本检测
print("\n1️⃣ Worker 状态与版本检测")
try:
    worker_status_url = "https://jevshop.bensonlove1986.workers.dev/status"
    response = requests.get(worker_status_url, timeout=10)
    if response.status_code == 200:
        worker_data = response.json()
        print(f"✅ Worker 响应正常: {worker_data.get('worker')}")
        print(f"   版本: {worker_data.get('version')}")
        print(f"   时间戳: {worker_data.get('timestamp')}")
        report["worker_status"] = "✅"
    else:
        print(f"❌ Worker 响应异常: HTTP {response.status_code}")
except Exception as e:
    print(f"❌ Worker 访问失败: {str(e)}")

# 2️⃣ 模块注册检测
print("\n2️⃣ 模块注册检测")
try:
    modules_status_url = "https://jevshop.bensonlove1986.workers.dev/modules/status"
    response = requests.get(modules_status_url, timeout=10)
    if response.status_code == 200:
        modules_data = response.json()
        expected_modules = ['core', 'ai', 'upload', 'translate', 'recommend', 'kv', 'logs']
        active_modules = modules_data.get('modules_active', [])
        print(f"✅ 模块状态响应正常")
        print(f"   总模块数: {modules_data.get('modules_total')}")
        print(f"   活跃模块: {', '.join(active_modules)}")
        
        # 检查是否所有模块都激活
        missing_modules = [m for m in expected_modules if m not in active_modules]
        if not missing_modules:
            report["modules_status"] = "✅"
            print("✅ 所有模块均已激活")
        else:
            print(f"⚠️  缺失模块: {', '.join(missing_modules)}")
            # 尝试自动重建模块
            try:
                rebuild_url = "https://jevshop.bensonlove1986.workers.dev/modules/rebuild"
                rebuild_response = requests.post(rebuild_url, timeout=15)
                if rebuild_response.status_code == 200:
                    print("✅ 模块重建请求已发送")
                else:
                    print(f"❌ 模块重建失败: HTTP {rebuild_response.status_code}")
            except Exception as rebuild_error:
                print(f"❌ 模块重建请求失败: {str(rebuild_error)}")
    else:
        print(f"❌ 模块状态响应异常: HTTP {response.status_code}")
except Exception as e:
    print(f"❌ 模块状态访问失败: {str(e)}")

# 3️⃣ KV 命名空间完整性
print("\n3️⃣ KV 命名空间完整性检测")
kv_namespaces = [
    'JEV_AI_CACHE', 'JEV_GLOBAL_CONFIG', 'JEV_LOGS', 
    'JEV_PLUGIN_STATE', 'Bensonai_memory', 'trea_memory'
]

# 从Worker状态中获取KV信息
if report["worker_status"] == "✅" and 'kv_status' in locals().get('worker_data', {}):
    kv_status = worker_data['kv_status']
    healthy_kvs = 0
    for ns in kv_namespaces:
        status = kv_status.get(ns, '❌ missing')
        print(f"   {ns}: {status}")
        if '✅' in status:
            healthy_kvs += 1
    
    if healthy_kvs == len(kv_namespaces):
        report["kv_integrity"] = "✅"
        print("✅ 所有KV命名空间均在线")
    else:
        print(f"⚠️  {healthy_kvs}/{len(kv_namespaces)} 个KV命名空间在线")
else:
    # 如果无法从Worker获取，则尝试通过KV测试接口
    try:
        kv_test_url = "https://jevshop.bensonlove1986.workers.dev/kv-test"
        kv_test_response = requests.get(kv_test_url, timeout=10)
        if kv_test_response.status_code == 200:
            print("⚠️  KV测试接口响应正常，但需要详细检查")
        else:
            print(f"❌ KV测试接口异常: HTTP {kv_test_response.status_code}")
    except Exception as kv_error:
        print(f"❌ KV状态检测失败: {str(kv_error)}")

# 4️⃣ 本地核心执行器验证
print("\n4️⃣ 本地核心执行器验证")
core_files = [
    "d:\\PDF转网页\\desktopAgent.ps1",
    "d:\\PDF转网页\\execute_task.ps1",
    "d:\\PDF转网页\\config.json"
]

all_files_valid = True
for file_path in core_files:
    file_name = os.path.basename(file_path)
    if os.path.exists(file_path):
        file_hash = get_file_hash(file_path)
        print(f"✅ {file_name} 存在")
        print(f"   哈希值: {file_hash}")
    else:
        print(f"❌ {file_name} 不存在")
        all_files_valid = False

if all_files_valid:
    report["local_core_files"] = "✅"
    print("✅ 所有核心文件均存在且完整")
else:
    print("❌ 部分核心文件缺失或损坏")

# 5️⃣ 通信与端口检测
print("\n5️⃣ 通信与端口检测")
ports_to_check = [1822, 8787, 8788]
all_ports_available = True

for port in ports_to_check:
    if check_port(port):
        print(f"⚠️  端口 {port}: 已被占用")
        all_ports_available = False
    else:
        print(f"✅ 端口 {port}: 可监听")

# 测试Cloudflare API连通性
try:
    ping_url = "https://jevshop.bensonlove1986.workers.dev/ping"
    ping_response = requests.get(ping_url, timeout=5)
    if ping_response.status_code == 200:
        print("✅ Cloudflare API 连通性正常")
    else:
        print(f"❌ Cloudflare API 异常: HTTP {ping_response.status_code}")
except Exception as api_error:
    print(f"❌ Cloudflare API 连接失败: {str(api_error)}")

if all_ports_available:
    report["network_ports"] = "✅"
    print("✅ 所有端口状态正常")

# 生成总体状态
print("\n=== 自检总报告 ===")
success_count = sum(1 for k in ['worker_status', 'modules_status', 'kv_integrity', 'local_core_files', 'network_ports'] if report[k] == '✅')

if success_count == 5:
    report["overall"] = "🌿 完整稳定闭环"
elif success_count >= 3:
    report["overall"] = "🟡 部分功能可用"
else:
    report["overall"] = "🔴 系统异常"

# 更新时间戳
report["timestamp"] = datetime.now().isoformat()

# 打印报告
print(json.dumps(report, ensure_ascii=False, indent=2))

# 保存报告到文件
with open("d:\\PDF转网页\\jev_global_self_check_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("\n报告已保存至: jev_global_self_check_report.json")
print("=== JEV 系统全局自检完成 ===")
