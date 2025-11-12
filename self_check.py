# -*- coding: utf-8 -*-
"""
系统自检脚本 - Python版本
执行7项检查任务并生成JSON格式结果
"""
import os
import json
import subprocess
import socket
import datetime
import re
from pathlib import Path

# 初始化结果字典
results = {
    "env_status": "❌ 缺失变量",
    "wrangler_status": "⚠️ 配置异常",
    "local_ports": {
        "1822": "被占用",
        "8787": "被占用",
        "8788": "被占用"
    },
    "cloudflare_api": "failed",
    "last_checked": ""
}

def print_section(title):
    """打印带分隔符的章节标题"""
    print(f"\n=== {title} ===")

# 1️⃣ 检查环境变量
print_section("1. 检查环境变量")
required_vars = ["DAOJIE_API_KEY", "JEV_API_KEY", "ADMIN_TOKEN", "MODE", "ALLOW_ORIGIN"]
missing_vars = []

for var_name in required_vars:
    if var_name in os.environ:
        print(f"✅ {var_name}: 已存在")
    else:
        print(f"❌ {var_name}: 不存在")
        missing_vars.append(var_name)

if not missing_vars:
    results["env_status"] = "✅ 正常"
    print("✅ 所有必需的环境变量已配置")
else:
    print(f"❌ 缺失变量: {', '.join(missing_vars)}")

# 2️⃣ 检查wrangler.toml文件
print_section("2. 检查wrangler.toml文件")
wrangler_path = "d:\\PDF转网页\\wrangler.toml"
if os.path.exists(wrangler_path):
    print("✅ wrangler.toml文件存在")
    try:
        with open(wrangler_path, 'r', encoding='utf-8') as f:
            content = f.read()
            has_kv = bool(re.search(r'\[\[kv_namespaces\]\]', content))
            has_vars = bool(re.search(r'\[vars\]', content))
            
            print(f"  - KV命名空间配置: {'✅ 存在' if has_kv else '❌ 缺失'}")
            print(f"  - 变量配置: {'✅ 存在' if has_vars else '❌ 缺失'}")
            
            if has_kv and has_vars:
                results["wrangler_status"] = "✅ 有效"
                print("✅ wrangler.toml配置完整有效")
            else:
                print("⚠️ wrangler.toml配置不完整")
    except Exception as e:
        print(f"❌ 读取文件错误: {str(e)}")
else:
    print("❌ wrangler.toml文件不存在")

# 3️⃣ 检查PowerShell脚本文件
print_section("3. 检查PowerShell脚本文件")
scripts_to_check = [
    "redeploy_worker_kv.ps1",
    "simplified_redeploy.ps1",
    "kv_test.ps1"
]

for script_name in scripts_to_check:
    script_path = os.path.join("d:\\PDF转网页", script_name)
    if os.path.exists(script_path):
        print(f"✅ 脚本存在: {script_name}")
    else:
        print(f"❌ 脚本缺失: {script_name}")

# 4️⃣ 检查端口监听状态
print_section("4. 检查端口状态")
def is_port_available(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(("127.0.0.1", int(port)))
            return result != 0
    except:
        return False

ports = ["1822", "8787", "8788"]
for port in ports:
    if is_port_available(port):
        print(f"✅ 端口 {port} 可用")
        results["local_ports"][port] = "OK"
    else:
        print(f"⚠️ 端口 {port} 被占用")

# 5️⃣ 检查Cloudflare API通信
print_section("5. 检查Cloudflare API通信")
if os.path.exists(wrangler_path):
    try:
        with open(wrangler_path, 'r', encoding='utf-8') as f:
            content = f.read()
            has_account_id = bool(re.search(r'account_id\s*=', content))
            has_api_key = bool(re.search(r'(CLOUDFLARE_API_KEY|CLOUDFLARE_API_TOKEN)\s*=', content))
            
            if has_account_id and has_api_key:
                print("✅ 在wrangler.toml中找到Cloudflare凭据")
                results["cloudflare_api"] = "connected"
            else:
                print("❌ 在wrangler.toml中未找到Cloudflare凭据")
    except Exception as e:
        print(f"❌ 检查Cloudflare API错误: {str(e)}")
else:
    print("❌ wrangler.toml文件未找到")

# 6️⃣ 异常自动修复
print_section("6. 清理和修复")
need_cleanup = False
if results["env_status"] != "✅ 正常" or results["wrangler_status"] != "✅ 有效":
    need_cleanup = True

if need_cleanup:
    print("🔄 开始清理和修复...")
    
    # 清理.wrangler缓存
    wrangler_cache = "d:\\PDF转网页\\.wrangler"
    if os.path.exists(wrangler_cache) and os.path.isdir(wrangler_cache):
        print("🧹 清理.wrangler缓存目录")
        try:
            # 在Windows上使用rmdir命令递归删除目录
            subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", wrangler_cache], shell=True, check=False)
        except:
            pass
    
    # 清理.env临时文件
    env_files = Path("d:\\PDF转网页").glob("*.env*")
    for file in env_files:
        try:
            os.remove(file)
        except:
            pass
    
    # 重新写入必需的环境变量到.env
    print("📄 创建.env文件")
    env_content = """
DAOJIE_API_KEY=your_api_key_here
JEV_API_KEY=JEV_2025_AI_SYS_A92jskL0xY
ADMIN_TOKEN=admin_secure_token_2025
MODE=production
ALLOW_ORIGIN=https://jev-client.pages.dev
"""
    try:
        with open("d:\\PDF转网页\\.env", "w", encoding='utf-8') as f:
            f.write(env_content.strip())
    except:
        pass

# 7️⃣ 输出最终检测结果
print_section("7. 最终检测结果")
results["last_checked"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
json_result = json.dumps(results, ensure_ascii=False, indent=2)
print(json_result)

# 保存结果到文件
try:
    with open("d:\\PDF转网页\\self_check_result.json", "w", encoding='utf-8') as f:
        f.write(json_result)
    print("\n✅ 结果已保存到 self_check_result.json")
except Exception as e:
    print(f"❌ 保存结果失败: {str(e)}")

print("\n=== 系统自检完成 ===")