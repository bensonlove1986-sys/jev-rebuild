#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json

# 设置API密钥和测试数据
api_key = "JEV_2025_AI_SYS_A92jskL0xY"
url = "https://ai.jevshop.workers.dev/reply"
headers = {
    "X-Auth-Key": api_key,
    "Content-Type": "application/json"
}
payload = {
    "agent_id": "test_agent",
    "text": "Hello JEV"
}

try:
    print(f"测试API调用: {url}")
    print(f"API密钥: {api_key}")
    
    # 发送请求
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    
    # 打印响应信息
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    # 尝试解析JSON
    if response.status_code == 200:
        data = response.json()
        print("\nJSON解析成功:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # 检查日志
        print("\n检查日志文件中是否有认证记录...")
        try:
            with open("logs/ai_service.log", "r", encoding="utf-8") as f:
                logs = f.read()
                if "key verified for agent test_agent" in logs:
                    print("✅ 日志中找到认证成功记录!")
                else:
                    print("❌ 日志中未找到认证记录")
                    # 打印日志最后几行
                    print("\n日志最后200字符:")
                    print(logs[-200:] if len(logs) > 200 else logs)
        except Exception as e:
            print(f"读取日志失败: {str(e)}")
    
    # 也测试一下本地连接
    print("\n测试本地连接...")
    local_url = "http://localhost:1822/reply"
    local_response = requests.post(local_url, headers=headers, json=payload, timeout=10)
    print(f"本地状态码: {local_response.status_code}")
    print(f"本地响应内容: {local_response.text}")
    
except Exception as e:
    print(f"请求失败: {str(e)}")
    import traceback
    traceback.print_exc()
