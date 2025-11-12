#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
JEV 环境配置修复脚本
用于扫描所有模块与 KV，将系统环境统一对齐至 jev_env_template.json
"""

import os
import re
import json
import time
import hashlib
from datetime import datetime

def get_file_hash(file_path):
    """计算文件哈希值"""
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def load_template():
    """加载配置模板"""
    template_path = "d:\\PDF转网页\\config\\jev_env_template.json"
    with open(template_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def scan_modules():
    """扫描系统模块"""
    modules = {
        'worker': [],
        'agents': [],
        'panels': [],
        'services': []
    }
    
    # 扫描worker文件
    worker_patterns = ['worker.js', 'worker_*.js']
    for pattern in worker_patterns:
        files = [f for f in os.listdir('d:\\PDF转网页') if f.startswith(pattern.split('*')[0])]
        modules['worker'].extend(files)
    
    # 扫描agent文件
    agent_patterns = ['desktopAgent.ps1', 'jev_*agent*.ps1']
    for pattern in agent_patterns:
        files = [f for f in os.listdir('d:\\PDF转网页') if 'agent' in f.lower() and f.endswith('.ps1')]
        modules['agents'].extend(list(set(files)))
    
    # 扫描控制面板文件
    panel_patterns = ['*panel*.html', '*panel*.js']
    for pattern in panel_patterns:
        files = [f for f in os.listdir('d:\\PDF转网页') if 'panel' in f.lower() and (f.endswith('.html') or f.endswith('.js'))]
        modules['panels'].extend(list(set(files)))
    
    # 扫描服务文件
    service_patterns = ['jev_*service*.py']
    for pattern in service_patterns:
        files = [f for f in os.listdir('d:\\PDF转网页') if 'service' in f.lower() and f.endswith('.py')]
        modules['services'].extend(list(set(files)))
    
    return modules

def scan_kv_bindings():
    """扫描KV绑定"""
    kv_pattern = re.compile(r'"(JEV_AI_CACHE|JEV_GLOBAL_CONFIG|JEV_LOGS|JEV_PLUGIN_STATE|Bensonai_memory|trea_memory|JEVPI)"')
    kv_files = []
    kv_usage = {}
    
    for root, _, files in os.walk('d:\\PDF转网页'):
        for file in files:
            if file.endswith(('.js', '.py', '.html', '.json')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        matches = kv_pattern.findall(content)
                        if matches:
                            kv_files.append(file_path)
                            for match in matches:
                                if match not in kv_usage:
                                    kv_usage[match] = []
                                kv_usage[match].append(file)
                except Exception as e:
                    print(f"无法读取文件 {file_path}: {e}")
    
    return kv_files, kv_usage

def check_encoding():
    """检查文件编码"""
    encoding_issues = []
    for root, _, files in os.walk('d:\\PDF转网页'):
        for file in files:
            if file.endswith(('.js', '.py', '.ps1', '.html', '.json', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read(4)
                        # 检查BOM
                        if content.startswith(b'\xef\xbb\xbf'):
                            encoding_issues.append({file_path: 'UTF-8 with BOM'})
                except Exception as e:
                    print(f"无法检查文件 {file_path}: {e}")
    
    return encoding_issues

def fix_encoding(file_path):
    """修复文件编码"""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # 移除BOM
        if content.startswith(b'\xef\xbb\xbf'):
            content = content[3:]
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"修复文件 {file_path} 失败: {e}")
        return False

def update_kv_bindings():
    """更新KV绑定"""
    kv_bindings = [
        'JEV_AI_CACHE',
        'JEV_GLOBAL_CONFIG',
        'JEV_LOGS',
        'JEV_PLUGIN_STATE',
        'Bensonai_memory',
        'trea_memory',
        'JEVPI'
    ]
    
    # 更新wrangler.toml
    wrangler_path = 'd:\\PDF转网页\\wrangler.toml'
    if os.path.exists(wrangler_path):
        with open(wrangler_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 移除注释的KV绑定
        for kv in kv_bindings:
            pattern = f'# \[\[kv_namespaces\]\]\s+# binding = "{kv}"\s+# id = "替换为实际的KV命名空间ID"'
            replacement = f'[[kv_namespaces]]\n  binding = "{kv}"\n  id = "REPLACE_WITH_ACTUAL_ID"'
            content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        with open(wrangler_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    return False

def generate_env_config(template):
    """生成新的环境配置文件"""
    config = {
        "version": template["version"],
        "environment": template["environment"],
        "base_url": template["base_url"],
        "allowed_origins": template["allowed_origins"],
        "kv_namespaces": {k: v for k, v in template["kv_namespaces"].items()},
        "r2_buckets": template["r2_buckets"],
        "endpoints": template["endpoints"],
        "ports": template["ports"],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "generated_by": "fix_environment_config.py"
    }
    
    config_path = "d:\\PDF转网页\\config\\jev_env.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    return config_path

def generate_verification_report(scan_results):
    """生成校验报告"""
    report = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "scan_summary": {
            "total_modules": scan_results["total_modules"],
            "kv_bindings_verified": scan_results["kv_bindings_verified"],
            "encoding_issues_fixed": scan_results["encoding_issues_fixed"],
            "files_modified": scan_results["files_modified"]
        },
        "verification_details": {
            "kv_integrity": scan_results["kv_integrity"],
            "encoding_status": scan_results["encoding_status"],
            "naming_conventions": scan_results["naming_conventions"],
            "endpoint_consistency": scan_results["endpoint_consistency"]
        },
        "errors": scan_results.get("errors", []),
        "warnings": scan_results.get("warnings", []),
        "success": scan_results.get("success", False)
    }
    
    report_path = "d:\\PDF转网页\\config\\jev_verification_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    return report_path

def main():
    """主函数"""
    print("===== JEV 环境配置修复开始 =====")
    start_time = time.time()
    
    scan_results = {
        "total_modules": 0,
        "kv_bindings_verified": 0,
        "encoding_issues_fixed": 0,
        "files_modified": 0,
        "kv_integrity": "❌",
        "encoding_status": "❌",
        "naming_conventions": "⚠️",
        "endpoint_consistency": "⚠️",
        "errors": [],
        "warnings": [],
        "success": False
    }
    
    try:
        # 1. 加载配置模板
        print("1. 加载配置模板...")
        template = load_template()
        print(f"   模板版本: {template['version']}")
        
        # 2. 扫描模块
        print("2. 扫描系统模块...")
        modules = scan_modules()
        total_modules = sum(len(files) for files in modules.values())
        scan_results["total_modules"] = total_modules
        print(f"   发现 {total_modules} 个模块文件")
        for module_type, files in modules.items():
            print(f"   - {module_type}: {len(files)} 个文件")
        
        # 3. 扫描KV绑定
        print("3. 扫描KV绑定...")
        kv_files, kv_usage = scan_kv_bindings()
        scan_results["kv_bindings_verified"] = len(kv_usage)
        print(f"   在 {len(kv_files)} 个文件中发现KV绑定")
        for kv, files in kv_usage.items():
            print(f"   - {kv}: 在 {len(files)} 个文件中使用")
        
        # 4. 检查并修复编码
        print("4. 检查并修复文件编码...")
        encoding_issues = check_encoding()
        print(f"   发现 {len(encoding_issues)} 个编码问题")
        
        fixed_count = 0
        for issue in encoding_issues:
            for file_path, encoding in issue.items():
                if fix_encoding(file_path):
                    fixed_count += 1
                    scan_results["files_modified"] += 1
        
        scan_results["encoding_issues_fixed"] = fixed_count
        print(f"   修复了 {fixed_count} 个文件的编码问题")
        
        # 5. 更新KV绑定
        print("5. 更新KV绑定配置...")
        if update_kv_bindings():
            scan_results["files_modified"] += 1
            print("   更新成功")
        else:
            print("   更新失败")
        
        # 6. 生成新的环境配置文件
        print("6. 生成新的环境配置文件...")
        config_path = generate_env_config(template)
        print(f"   生成配置文件: {config_path}")
        
        # 7. 更新状态
        scan_results["kv_integrity"] = "✅" if len(kv_usage) >= 7 else "⚠️"
        scan_results["encoding_status"] = "✅" if fixed_count == len(encoding_issues) else "⚠️"
        scan_results["success"] = True
        
        # 8. 生成校验报告
        print("7. 生成校验报告...")
        report_path = generate_verification_report(scan_results)
        print(f"   生成报告文件: {report_path}")
        
    except Exception as e:
        print(f"错误: {e}")
        scan_results["errors"].append(str(e))
    
    end_time = time.time()
    print(f"\n===== JEV 环境配置修复完成 =====")
    print(f"耗时: {end_time - start_time:.2f} 秒")
    print(f"成功状态: {'✅' if scan_results['success'] else '❌'}")
    
    # 输出关键信息
    print("\n关键结果:")
    print(f"- KV完整性: {scan_results['kv_integrity']}")
    print(f"- 编码状态: {scan_results['encoding_status']}")
    print(f"- 生成配置: {config_path if 'config_path' in locals() else '❌'}")
    print(f"- 校验报告: {report_path if 'report_path' in locals() else '❌'}")

if __name__ == "__main__":
    main()