#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JEV系统KV全量刷新与绑定验证流程
"""

import os
import json
import subprocess
import time
from datetime import datetime

def run_command(command):
    """执行命令并返回结果，处理编码问题"""
    print(f"执行命令: {command}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=False,  # 以二进制方式获取输出
            timeout=300
        )
        # 尝试用utf-8解码，如果失败则用gbk并替换错误字符
        try:
            stdout = result.stdout.decode('utf-8')
        except UnicodeDecodeError:
            stdout = result.stdout.decode('gbk', errors='replace')
        
        try:
            stderr = result.stderr.decode('utf-8')
        except UnicodeDecodeError:
            stderr = result.stderr.decode('gbk', errors='replace')
        
        return {
            'returncode': result.returncode,
            'stdout': stdout,
            'stderr': stderr
        }
    except Exception as e:
        print(f"命令执行异常: {e}")
        return None

def clear_worker_cache():
    """清除Worker旧运行时缓存与绑定映射"""
    print("=== 步骤1: 清除Worker旧运行时缓存与绑定映射 ===")
    
    # 清除.wrangler目录（本地缓存）
    wrangler_dir = os.path.join(os.getcwd(), '.wrangler')
    if os.path.exists(wrangler_dir):
        print(f"删除.wrangler缓存目录: {wrangler_dir}")
        if os.name == 'nt':
            result = run_command(f"rmdir /s /q {wrangler_dir}")
        else:
            result = run_command(f"rm -rf {wrangler_dir}")
        
        if result and result['returncode'] == 0:
            print("✅ 缓存目录已删除")
        else:
            print(f"❌ 缓存目录删除失败: {result['stderr'] if result else '未知错误'}")
    else:
        print("ℹ️ .wrangler缓存目录不存在，无需删除")
    
    # 清除npm缓存
    print("清除npm缓存...")
    run_command("npm cache clean --force")

def update_wrangler_toml_bindings():
    """更新wrangler.toml文件中的KV绑定配置"""
    print("\n=== 步骤2: 更新KV命名空间绑定 ===")
    
    wrangler_path = os.path.join(os.getcwd(), 'wrangler.toml')
    if not os.path.exists(wrangler_path):
        print(f"❌ 未找到wrangler.toml文件: {wrangler_path}")
        return False
    
    # 定义KV绑定配置
    kv_bindings = [
        'JEV_AI_CACHE',
        'JEV_GLOBAL_CONFIG',
        'JEV_LOGS',
        'JEV_PLUGIN_STATE',
        'Bensonai_memory',
        'trea_memory',
        'JEVPI',
        'R2_BUCKET'
    ]
    
    try:
        # 读取现有文件内容
        with open(wrangler_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 构建新的kv_namespaces配置
        kv_config = """\n# KV命名空间绑定
kv_namespaces = [
"""
        
        for binding in kv_bindings:
            kv_config += f"  {{ binding = \"{binding}\", id = \"{binding.lower()}_id\" }},\n"
        
        kv_config += "]\n"
        
        # 检查并替换现有的kv_namespaces部分
        import re
        if re.search(r'kv_namespaces\s*=\s*\[', content):
            # 替换现有配置
            content = re.sub(r'kv_namespaces\s*=\s*\[.*?\]', kv_config.strip(), content, flags=re.DOTALL)
        else:
            # 添加新配置
            content += kv_config
        
        # 保存更新后的文件
        with open(wrangler_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已更新wrangler.toml中的KV绑定配置")
        print(f"已配置的KV绑定: {', '.join(kv_bindings)}")
        return kv_bindings
    except Exception as e:
        print(f"❌ 更新KV绑定失败: {e}")
        return []

def deploy_worker():
    """重新部署Worker"""
    print("\n=== 步骤3: 重新部署Worker ===")
    
    print("执行 wrangler deploy...")
    result = run_command("npx wrangler deploy")
    
    if result and result['returncode'] == 0:
        print("✅ Worker 部署成功")
        return True
    else:
        print(f"❌ Worker 部署失败")
        if result:
            print(f"错误输出: {result['stderr']}")
        return False

def test_kv_bindings():
    """测试KV绑定状态"""
    print("\n=== 步骤5: 测试KV绑定状态 ===")
    
    test_url = "https://jevshop.bensonlove1986.workers.dev/kv/test"
    print(f"调用测试接口: {test_url}")
    
    result = run_command(f"curl -s {test_url}")
    
    if not result:
        print("❌ 无法连接到测试接口")
        return False, []
    
    # 尝试解析JSON响应
    try:
        response_data = json.loads(result['stdout'])
        print(f"接口响应: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
        
        # 检查是否有Missing binding
        missing_bindings = []
        if 'result' in response_data:
            for binding_name, status in response_data['result'].items():
                if 'Missing binding' in status:
                    missing_bindings.append(binding_name)
        
        if missing_bindings:
            print(f"❌ 发现缺失的绑定: {missing_bindings}")
            return False, missing_bindings
        else:
            print("✅ 所有KV绑定正常")
            return True, list(response_data['result'].keys()) if 'result' in response_data else []
    except json.JSONDecodeError:
        print(f"❌ 无法解析响应: {result['stdout']}")
        # 直接从输出中查找Missing binding
        if 'Missing binding' in result['stdout']:
            print("❌ 响应中包含Missing binding")
            return False, []
        else:
            print("ℹ️ 响应不是JSON格式，但未发现Missing binding")
            return True, []

def export_worker_snapshot():
    """导出Worker环境快照"""
    print("\n=== 导出Worker环境快照 ===")
    
    snapshot_file = "kv_status_report.md"
    
    try:
        with open(snapshot_file, 'w', encoding='utf-8') as f:
            f.write(f"# JEV Worker KV 状态报告\n\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## 部署环境信息\n\n")
            
            # 获取wrangler版本信息
            result = run_command("npx wrangler --version")
            if result:
                f.write(f"### Wrangler版本\n```\n{result['stdout']}\n```\n\n")
            
            # 获取当前目录结构
            f.write("### 项目文件结构\n```\n")
            if os.name == 'nt':
                result = run_command("dir /b")
            else:
                result = run_command("ls -la")
            if result:
                f.write(result['stdout'])
            f.write("```\n\n")
            
            # 获取wrangler.toml内容
            f.write("### wrangler.toml 配置\n```toml\n")
            if os.path.exists("wrangler.toml"):
                with open("wrangler.toml", 'r', encoding='utf-8') as f_toml:
                    f.write(f_toml.read())
            f.write("```\n\n")
            
            # 获取KV测试响应
            f.write("### KV测试响应\n```\n")
            result = run_command("curl -s https://jevshop.bensonlove1986.workers.dev/kv/test")
            if result:
                f.write(result['stdout'])
            f.write("```\n\n")
        
        print(f"✅ 环境快照已导出到: {snapshot_file}")
        return True
    except Exception as e:
        print(f"❌ 导出环境快照失败: {e}")
        return False

def main():
    """主函数"""
    print("=== JEV系统KV全量刷新与绑定验证流程开始 ===")
    
    # 初始化报告
    report = {
        "deploy_status": "fail",
        "kv_bindings_refreshed": [],
        "final_test_result": "❌ 未执行测试",
        "missing_bindings": [],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    try:
        # 步骤1: 清除缓存
        clear_worker_cache()
        
        # 步骤2: 更新KV绑定
        bindings = update_wrangler_toml_bindings()
        if bindings:
            report["kv_bindings_refreshed"] = bindings
        
        # 步骤3: 部署Worker
        deployed = deploy_worker()
        if deployed:
            report["deploy_status"] = "success"
            
            # 步骤4: 等待30秒
            print("\n=== 步骤4: 等待30秒让部署生效 ===")
            for i in range(30, 0, -1):
                print(f"等待中... {i}秒", end="\r")
                time.sleep(1)
            print()
            
            # 步骤5: 第一次测试
            success, missing = test_kv_bindings()
            
            # 步骤6: 如果失败，进行第二次同步
            if not success:
                print("\n=== 步骤6: 执行第二次同步 ===")
                report["missing_bindings"] = missing
                
                # 再次部署
                print("执行第二次部署...")
                # 直接运行命令，避免递归调用
                run_command("npx wrangler deploy")
                
                # 再次等待
                print("再次等待30秒...")
                for i in range(30, 0, -1):
                    print(f"等待中... {i}秒", end="\r")
                    time.sleep(1)
                print()
                
                # 再次测试
                success, missing = test_kv_bindings()
            
            # 更新最终测试结果
            if success:
                report["final_test_result"] = "✅ 全部通过"
                report["missing_bindings"] = []
            else:
                report["final_test_result"] = "❌ 仍有缺失"
                if missing:
                    report["missing_bindings"] = missing
                
                # 步骤8: 导出环境快照
                export_worker_snapshot()
    
    except Exception as e:
        print(f"执行过程出错: {e}")
    
    # 输出最终报告
    print("\n=== 最终报告 ===")
    report_json = json.dumps(report, ensure_ascii=False, indent=2)
    print(report_json)
    
    # 保存报告到文件
    with open("kv_refresh_report.json", "w", encoding="utf-8") as f:
        f.write(report_json)
    
    print("\n报告已保存到 kv_refresh_report.json")
    print("=== KV刷新与验证流程完成 ===")

if __name__ == "__main__":
    main()