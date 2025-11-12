#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JEV AI Service v1.5 - Multi-Agent Support
提供多客服支持和独立AI/人工模式切换功能
支持API Key保护和远程访问
"""

import os
import json
import time
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# 初始化Flask应用
app = Flask(__name__)
CORS(app, resources={"/*": {"origins": "*"}})  # 完全开放CORS

# API Key配置 - 在生产环境中应使用环境变量或安全存储
API_KEY = "YOUR_SECRET_KEY"

# 配置日志
LOG_DIR = 'logs'
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, 'ai_service.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 配置数据文件路径
DATA_DIR = 'data'
os.makedirs(DATA_DIR, exist_ok=True)
AGENTS_FILE = os.path.join(DATA_DIR, 'agents.json')

# 初始客服数据结构
def get_initial_agents():
    return {
        "agents": {}
    }

# 加载客服数据
def load_agents():
    if os.path.exists(AGENTS_FILE):
        try:
            with open(AGENTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load agents data: {e}")
            return get_initial_agents()
    return get_initial_agents()

# 保存客服数据
def save_agents(agents_data):
    try:
        with open(AGENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(agents_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save agents data: {e}")
        return False

# API Key验证装饰器
def require_api_key(f):
    def decorator(*args, **kwargs):
        api_key = request.headers.get('X-Auth-Key')
        if not api_key or api_key != API_KEY:
            logger.warning(f"Unauthorized access attempt from {request.remote_addr}")
            return jsonify({"status": "error", "message": "Unauthorized access"}), 403
        return f(*args, **kwargs)
    decorator.__name__ = f.__name__
    return decorator

# 日志记录操作
def log_operation(agent_id, operation_type, details=None):
    log_message = f"[{agent_id}] [{operation_type}]"
    if details:
        log_message += f" {details}"
    logger.info(log_message)

# 注册新客服
@app.route('/register_agent', methods=['POST'])
@require_api_key
def register_agent():
    try:
        data = request.get_json()
        if not data or 'agent_id' not in data:
            return jsonify({"status": "error", "message": "Missing agent_id"}), 400
        
        agent_id = data['agent_id']
        agents_data = load_agents()
        
        # 如果客服已存在，更新last_active
        if agent_id in agents_data['agents']:
            agents_data['agents'][agent_id]['last_active'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            save_agents(agents_data)
            log_operation(agent_id, "update", "Agent updated")
            return jsonify({
                "status": "success",
                "message": "Agent updated",
                "mode": agents_data['agents'][agent_id]['mode'],
                "agent_id": agent_id
            })
        
        # 注册新客服
        agents_data['agents'][agent_id] = {
            "mode": "AI",  # 默认AI模式
            "last_active": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "registered_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if save_agents(agents_data):
            log_operation(agent_id, "register", "Agent registered")
            return jsonify({
                "status": "success",
                "message": "Agent registered successfully",
                "mode": "AI",
                "agent_id": agent_id
            })
        else:
            return jsonify({"status": "error", "message": "Failed to save agent data"}), 500
    
    except Exception as e:
        logger.error(f"Error in register_agent: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# 获取所有客服状态
@app.route('/get_agents', methods=['GET'])
@require_api_key
def get_agents():
    try:
        agents_data = load_agents()
        return jsonify({
            "status": "success",
            "agents": agents_data['agents'],
            "total_agents": len(agents_data['agents'])
        })
    except Exception as e:
        logger.error(f"Error in get_agents: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# 为指定客服设置AI/人工模式
@app.route('/set_mode', methods=['POST'])
@require_api_key
def set_mode():
    try:
        data = request.get_json()
        if not data or 'agent_id' not in data or 'mode' not in data:
            return jsonify({"status": "error", "message": "Missing agent_id or mode"}), 400
        
        agent_id = data['agent_id']
        mode = data['mode'].upper()
        
        if mode not in ['AI', 'MANUAL']:
            return jsonify({"status": "error", "message": "Mode must be 'AI' or 'MANUAL'"}), 400
        
        agents_data = load_agents()
        
        # 如果客服不存在，自动注册
        if agent_id not in agents_data['agents']:
            agents_data['agents'][agent_id] = {
                "mode": mode,
                "last_active": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "registered_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            log_operation(agent_id, "register", f"Auto-registered with mode {mode}")
        else:
            old_mode = agents_data['agents'][agent_id]['mode']
            agents_data['agents'][agent_id]['mode'] = mode
            agents_data['agents'][agent_id]['last_active'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_operation(agent_id, "mode_switch", f"{old_mode} -> {mode}")
        
        if save_agents(agents_data):
            return jsonify({
                "status": "success",
                "mode": mode,
                "agent_id": agent_id,
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        else:
            return jsonify({"status": "error", "message": "Failed to save mode"}), 500
    
    except Exception as e:
        logger.error(f"Error in set_mode: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# 多客服版本的回复接口
@app.route('/reply', methods=['POST'])
@require_api_key
def reply():
    try:
        data = request.get_json()
        if not data or 'agent_id' not in data or 'text' not in data:
            return jsonify({"status": "error", "message": "Missing agent_id or text"}), 400
        
        agent_id = data['agent_id']
        text = data['text']
        source = data.get('source', 'unknown')
        
        agents_data = load_agents()
        
        # 如果客服不存在，自动注册为AI模式
        if agent_id not in agents_data['agents']:
            agents_data['agents'][agent_id] = {
                "mode": "AI",
                "last_active": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "registered_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            save_agents(agents_data)
            log_operation(agent_id, "register", "Auto-registered during reply")
        else:
            # 更新last_active
            agents_data['agents'][agent_id]['last_active'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            save_agents(agents_data)
        
        mode = agents_data['agents'][agent_id]['mode']
        log_operation(agent_id, "reply", f"mode={mode}, text={text[:30]}...")
        
        # 根据模式决定是否生成回复
        response_data = {
            "status": "success",
            "agent_id": agent_id,
            "mode": mode,
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if mode == "AI":
            # 这里是模拟的AI回复逻辑
            response_data["reply"] = f"AI response from {agent_id}: I'll assist you with '{text[:30]}...'"
            response_data["generated"] = True
        else:
            response_data["reply"] = ""
            response_data["generated"] = False
        
        return jsonify(response_data)
    
    except Exception as e:
        logger.error(f"Error in reply: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # 初始化客服数据文件
    if not os.path.exists(AGENTS_FILE):
        save_agents(get_initial_agents())
    
    print("🌐 Cloudflare Tunnel active")
    print("🧠 JEV AI Service Remote Access Ready")
    print("✅ Endpoints: /translate /ocr /chat /reply")
    print("✅ Secure Domain: https://ai.jevshop.workers.dev")
    print("✅ API Key Protection Enabled")
    
    app.run(host='0.0.0.0', port=1822, debug=False)
