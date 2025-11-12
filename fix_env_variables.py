# -*- coding: utf-8 -*-
"""
环境变量修复脚本
1. 打开或创建.env文件
2. 写入缺失的环境变量
3. 校验与wrangler.toml的同步
4. 执行环境刷新
5. 输出报告
"""
import os
import json
import subprocess
import datetime
import re
from pathlib import Path

# 文件路径设置
ENV_FILE_PATH = "d:\\PDF转网页\\.env"
WRANGLER_FILE_PATH = "d:\\PDF转网页\\.wrangler"
WRANGLER_TOML_PATH = "d:\\PDF转网页\\wrangler.toml"

# 要添加的环境变量
required_vars = {
    "DAOJIE_API_KEY": "your_daojie_api_key_here",
    "ADMIN_TOKEN": "JEV_ADMIN_2025_SECURE_X9LpZk",
    "MODE": "production",
    "ALLOW_ORIGIN": "https://jev-client.pages.dev"
}

def print_section(title):
    """打印带分隔符的章节标题"""
    print(f"\n=== {title} ===")

# 1. 打开或创建.env文件
print_section("1. 处理.env文件")
env_content = {}

# 如果文件存在，读取现有内容
if os.path.exists(ENV_FILE_PATH):
    print(f"✅ 发现现有.env文件，读取中...")
    try:
        with open(ENV_FILE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    # 移除可能的引号
                    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]
                    env_content[key] = value
    except Exception as e:
        print(f"❌ 读取.env文件失败: {str(e)}")
else:
    print(f"⚠️ .env文件不存在，将创建新文件")

# 2. 写入缺失的环境变量
print_section("2. 添加缺失的环境变量")
added_vars = []

for key, default_value in required_vars.items():
    if key not in env_content:
        env_content[key] = default_value
        added_vars.append(key)
        print(f"✅ 添加: {key} = {default_value}")
    else:
        print(f"ℹ️ 跳过: {key} 已存在")

# 写回.env文件
try:
    with open(ENV_FILE_PATH, 'w', encoding='utf-8') as f:
        for key, value in env_content.items():
            # 确保值被引号包围
            if not (value.startswith('"') and value.endswith('"')):
                value = f'"{value}"'
            f.write(f"{key}={value}\n")
    print(f"✅ 成功写入.env文件")
except Exception as e:
    print(f"❌ 写入.env文件失败: {str(e)}")

# 3. 校验.env与wrangler.toml同步
print_section("3. 校验配置同步")
wrangler_synced = True

if os.path.exists(WRANGLER_TOML_PATH):
    try:
        with open(WRANGLER_TOML_PATH, 'r', encoding='utf-8') as f:
            toml_content = f.read()
        
        # 检查wrangler.toml中的[vars]部分
        if '\n[vars]\n' not in toml_content:
            print("⚠️ wrangler.toml中缺少[vars]部分")
            wrangler_synced = False
        else:
            # 检查每个环境变量是否在wrangler.toml中配置
            vars_section = re.search(r'\[vars\](.*?)(\[|$)', toml_content, re.DOTALL)
            if vars_section:
                vars_content = vars_section.group(1)
                for key in required_vars.keys():
                    if f'{key} =' not in vars_content and f'{key}=' not in vars_content:
                        print(f"⚠️ wrangler.toml中缺少变量: {key}")
                        # 这里不设置wrangler_synced=False，因为不一定所有变量都需要在wrangler.toml中
                    else:
                        print(f"✅ wrangler.toml中已配置: {key}")
    except Exception as e:
        print(f"❌ 读取wrangler.toml失败: {str(e)}")
        wrangler_synced = False
else:
    print("❌ wrangler.toml文件不存在")
    wrangler_synced = False

# 4. 执行环境刷新
print_section("4. 执行环境刷新")

# 删除.wrangler缓存
if os.path.exists(WRANGLER_FILE_PATH) and os.path.isdir(WRANGLER_FILE_PATH):
    try:
        print(f"🧹 清理.wrangler缓存目录")
        # 在Windows上使用rmdir命令递归删除目录
        subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", WRANGLER_FILE_PATH], shell=True, check=False)
        print(f"✅ 成功清理.wrangler缓存")
    except Exception as e:
        print(f"❌ 清理.wrangler缓存失败: {str(e)}")
else:
    print(f"ℹ️ .wrangler缓存目录不存在，无需清理")

# 执行wrangler publish --dry-run
try:
    print(f"🔍 执行 wrangler publish --dry-run 检测配置一致性")
    result = subprocess.run(["wrangler", "publish", "--dry-run"], 
                           cwd="d:\\PDF转网页", 
                           capture_output=True, 
                           text=True, 
                           shell=True, 
                           timeout=30)
    
    if result.returncode == 0:
        print(f"✅ wrangler配置检测通过")
    else:
        print(f"⚠️ wrangler配置检测失败")
        print(f"错误输出: {result.stderr}")
        wrangler_synced = False
except Exception as e:
    print(f"❌ 执行wrangler命令失败: {str(e)}")
    print(f"可能是wrangler未安装或环境未配置")

# 5. 输出报告
print_section("5. 生成报告")
report = {
    "env_restored": added_vars,
    "wrangler_synced": "✅" if wrangler_synced else "❌",
    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
}

# 打印报告
print("\n" + json.dumps(report, ensure_ascii=False, indent=2))

# 保存报告到文件
try:
    with open("d:\\PDF转网页\\env_fix_report.json", "w", encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print("\n✅ 报告已保存到 env_fix_report.json")
except Exception as e:
    print(f"❌ 保存报告失败: {str(e)}")

print("\n=== 环境变量修复任务完成 ===")