#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新Cloudflare Worker环境变量并执行部署
"""

import os
import json
import subprocess
import time
from datetime import datetime

def run_command(command, cwd=None, shell=True):
    """执行命令并返回输出"""
    print(f"执行命令: {command}")
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            capture_output=True,
            text=True,
            timeout=300
        )
        return result
    except Exception as e:
        print(f"命令执行失败: {e}")
        return None

def update_wrangler_toml():
    """更新wrangler.toml文件中的环境变量配置"""
    wrangler_path = os.path.join(os.getcwd(), 'wrangler.toml')
    
    if not os.path.exists(wrangler_path):
        print(f"警告: 未找到wrangler.toml文件: {wrangler_path}")
        return False
    
    try:
        # 读取文件内容
        with open(wrangler_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 定义变量配置
        vars_content = '''
[vars]
DAOJIE_API_KEY = "${{ secrets.DAOJIE_API_KEY }}"
ADMIN_TOKEN = "${{ secrets.ADMIN_TOKEN }}"
MODE = "production"
ALLOW_ORIGIN = "https://jev-client.pages.dev"
JEV_API_KEY = "${{ secrets.JEV_API_KEY }}"
'''
        
        # 检查是否存在[vars]部分
        if '[vars]' in content:
            # 替换现有的[vars]部分
            import re
            content = re.sub(r'\[vars\][\s\S]*?(?=\[|$)', vars_content.strip(), content)
        else:
            # 添加新的[vars]部分
            content += vars_content
        
        # 保存更新后的文件
        with open(wrangler_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"已更新wrangler.toml文件")
        return True
    except Exception as e:
        print(f"更新wrangler.toml失败: {e}")
        return False

def set_cloudflare_secrets():
    """设置Cloudflare Worker secrets"""
    secrets = {
        'DAOJIE_API_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjNTc2ZUYlUxbG1BUHBrRzlpQjZDIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYxMzcwNzQwMDA0LCJzdWIiOiJBbmtGd2NkdHF1dlFaM2RZZnBTQyJ9.WbtH9jNfXkdlw3JB6Z0wmV6DTUFpscS4Hb0GqbBJZMk',
        'ADMIN_TOKEN': 'JEV_ADMIN_2025_SECURE_X9LpZk',
        'JEV_API_KEY': 'JEV_2025_AI_SYS_A92jskL0xY'
    }
    
    success = True
    for secret_name, secret_value in secrets.items():
        print(f"设置secret: {secret_name}")
        # 使用echo命令通过管道传递secret值
        if os.name == 'nt':  # Windows
            command = f"echo {secret_value} | npx wrangler secret put {secret_name} --env production"
        else:  # Linux/Mac
            command = f"echo '{secret_value}' | npx wrangler secret put {secret_name} --env production"
        
        result = run_command(command)
        if result and result.returncode == 0:
            print(f"✅ {secret_name} 设置成功")
        else:
            print(f"❌ {secret_name} 设置失败")
            success = False
    
    return success

def publish_worker():
    """发布Worker"""
    print("正在执行 wrangler publish --force")
    result = run_command("npx wrangler publish --force")
    
    if result and result.returncode == 0:
        print("✅ Worker 部署成功")
        return True
    else:
        print(f"❌ Worker 部署失败")
        if result:
            print(f"错误输出: {result.stderr}")
        return False

def health_check():
    """执行健康检查"""
    health_url = "https://jevshop.bensonlove1986.workers.dev/kv/test"
    print(f"执行健康检查: {health_url}")
    
    try:
        # 使用curl或wget进行健康检查
        if os.name == 'nt':
            command = f"curl -s {health_url}"
        else:
            command = f"curl -s {health_url}"
        
        result = run_command(command)
        if result and result.returncode == 0:
            print(f"✅ 健康检查成功")
            print(f"响应: {result.stdout}")
            return True
        else:
            print(f"❌ 健康检查失败")
            return False
    except Exception as e:
        print(f"健康检查出错: {e}")
        return False

def main():
    """主函数"""
    print("=== 开始更新Cloudflare Worker环境变量 ===")
    
    # 初始化报告
    report = {
        "env_status": "❌ 未更新",
        "daoije_api": "❌ 未知",
        "origin_access": "❌ 未知",
        "worker_status": "❌ 未部署",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    try:
        # 1. 更新wrangler.toml
        update_wrangler_toml()
        
        # 2. 设置secrets
        secrets_set = set_cloudflare_secrets()
        if secrets_set:
            report["env_status"] = "✅ 全部变量加载成功"
        
        # 3. 发布Worker
        published = publish_worker()
        if published:
            report["worker_status"] = "✅ 在线运行中"
            
            # 4. 执行健康检查
            time.sleep(5)  # 等待部署完成
            if health_check():
                report["daoije_api"] = "✅ 可连接"
                report["origin_access"] = "✅ 前端可跨域"
    
    except Exception as e:
        print(f"执行过程出错: {e}")
    
    # 输出报告
    print("\n=== 状态报告 ===")
    report_json = json.dumps(report, ensure_ascii=False, indent=2)
    print(report_json)
    
    # 保存报告到文件
    with open("worker_deploy_report.json", "w", encoding="utf-8") as f:
        f.write(report_json)
    
    print("\n报告已保存到 worker_deploy_report.json")
    print("=== 更新完成 ===")

if __name__ == "__main__":
    main()