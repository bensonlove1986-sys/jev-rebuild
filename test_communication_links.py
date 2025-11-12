#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import time
import json

def test_service(endpoint, service_name, api_key=None):
    """测试单个服务的健康检查端点"""
    print(f"\n📡 测试 {service_name} 服务连接: {endpoint}")
    
    try:
        headers = {}
        if api_key:
            headers['X-Auth-Key'] = api_key
        
        response = requests.get(endpoint, headers=headers, timeout=5)
        
        print(f"✅ 状态码: {response.status_code}")
        print(f"📋 响应内容: {response.text}")
        
        # 尝试解析JSON响应
        try:
            data = response.json()
            print(f"📊 状态: {data.get('status', 'N/A')}")
        except json.JSONDecodeError:
            print("⚠️  响应不是有效的JSON")
        
        return response.status_code == 200
    
    except requests.exceptions.Timeout:
        print(f"❌ 超时: 无法连接到 {service_name}")
        return False
    except requests.exceptions.ConnectionError:
        print(f"❌ 连接错误: {service_name} 服务未运行")
        return False
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        return False

def test_communication_chain():
    """测试完整的通信链路"""
    print("🚀 开始JEV系统通信链路测试")
    print("=" * 60)
    
    # 配置
    api_key = "JEV_2025_AI_SYS_A92jskL0xY"
    services = [
        {"url": "http://localhost:1820/ping", "name": "Agent", "key": None},
        {"url": "http://localhost:1821/ping", "name": "Control Center", "key": None},
        {"url": "http://localhost:1822/ping", "name": "AI Service", "key": api_key}
    ]
    
    # 测试各服务
    results = []
    for service in services:
        success = test_service(service["url"], service["name"], service["key"])
        results.append({
            "name": service["name"],
            "url": service["url"],
            "success": success
        })
    
    # 测试Agent到AI服务的通信（链路测试）
    print("\n🔗 测试链路: Agent → AI Service")
    try:
        agent_to_ai = requests.get("http://localhost:1820/status", timeout=5)
        if agent_to_ai.status_code == 200:
            print(f"✅ Agent 状态检查成功: {agent_to_ai.status_code}")
        else:
            print(f"❌ Agent 状态检查失败: {agent_to_ai.status_code}")
    except Exception as e:
        print(f"❌ Agent→AI 链路测试失败: {str(e)}")
    
    # 总结
    print("\n" + "=" * 60)
    print("📊 通信链路测试结果总结")
    
    all_success = True
    for result in results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['name']}: {result['url']}")
        if not result["success"]:
            all_success = False
    
    print("\n" + "=" * 60)
    if all_success:
        print("🎉 所有通信链路测试通过！")
        print("✅ Agent 服务已连接")
        print("✅ 控制中心已连接")
        print("✅ AI 服务已连接")
    else:
        print("⚠️  部分通信链路测试失败，请检查相关服务")
    
    return all_success

if __name__ == "__main__":
    print("JEV系统通信链路测试工具")
    print("执行时间: " + time.strftime("%Y-%m-%d %H:%M:%S"))
    print()
    
    test_communication_chain()
    
    print("\n测试完成！请刷新浏览器中的JEV控制面板以更新连接状态。")