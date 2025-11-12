#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import time
import re
import random
from flask import Flask, request, jsonify

# 从环境变量读取API密钥
JEV_API_KEY = os.getenv('JEV_API_KEY', '')

# 创建 Flask 应用
app = Flask(__name__)

# 配置
PORT = 1822
LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "ai_service.log")
PRODUCTS_FILE = os.path.join("data", "products.json")

# 上下文缓存
chat_context = []
MAX_CONTEXT_LENGTH = 10

# 全局模式状态 - AI: 自动回复, MANUAL: 人工模式
current_mode = "AI"

# API密钥认证装饰器
def require_api_key(f):
    def decorator(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        # 获取请求头中的API密钥
        api_key = request.headers.get('X-Auth-Key', '')
        
        # 验证API密钥
        if not api_key or api_key != JEV_API_KEY:
            return jsonify({
                "status": "error",
                "message": "Invalid or missing API key",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 401
        
        # 记录认证成功
        agent_id = request.json.get('agent_id', 'unknown') if request.json else 'unknown'
        log_message('auth', {'agent_id': agent_id}, f'key verified for agent {agent_id}')
        
        return f(*args, **kwargs)
    # 为装饰器函数设置与原函数相同的名称，避免路由名称冲突
    decorator.__name__ = f.__name__
    decorator.__doc__ = f.__doc__
    decorator.__module__ = f.__module__
    return decorator

# 确保日志目录存在
os.makedirs(LOG_DIR, exist_ok=True)

# 加载产品数据
def load_products():
    try:
        if os.path.exists(PRODUCTS_FILE):
            with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        log_error(f"加载产品数据失败: {str(e)}")
        return {}

# 日志函数
def log_message(endpoint, input_data, output_summary):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{endpoint}] {json.dumps(input_data)} → {output_summary}\n"
    print(log_entry.strip())
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception as e:
        print(f"写入日志失败: {str(e)}")

def log_error(message):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    error_entry = f"[{timestamp}] [ERROR] {message}\n"
    print(error_entry.strip(), file=sys.stderr)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(error_entry)
    except Exception:
        pass
        
def log_mode_switch(mode):
    """记录模式切换操作"""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] Mode switched to: {mode}\n"
    print(log_entry.strip())
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception:
        pass

# 语言检测
def detect_language(text):
    # 简单的语言检测逻辑
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    if len(chinese_chars) > len(text) * 0.3:
        return "zh"
    return "en"

# 模拟 DEEPSEEK 翻译
def deepseek_translate(text, target_lang="en"):
    # 模拟翻译功能
    source_lang = detect_language(text)
    if source_lang == target_lang:
        return text, source_lang, target_lang
    
    # 简单的模拟翻译
    if source_lang == "zh" and target_lang == "en":
        # 一些简单的翻译映射
        translations = {
            "你好": "Hello",
            "多少钱": "How much",
            "价格": "Price",
            "传感器": "sensor",
            "谢谢": "Thank you"
        }
        result = text
        for zh, en in translations.items():
            result = result.replace(zh, en)
        return result, source_lang, target_lang
    elif source_lang == "en" and target_lang == "zh":
        translations = {
            "Hello": "你好",
            "How much": "多少钱",
            "Price": "价格",
            "sensor": "传感器",
            "Thank you": "谢谢"
        }
        result = text
        for en, zh in translations.items():
            result = result.replace(en, zh)
        return result, source_lang, target_lang
    
    return text, source_lang, target_lang

# 模拟 DEEPSEEK 对话
def deepseek_chat(message):
    # 更新上下文
    chat_context.append(message)
    if len(chat_context) > MAX_CONTEXT_LENGTH:
        chat_context.pop(0)
    
    # 简单的对话回复
    responses = [
        "I understand your request. Let me help you with that.",
        "Thank you for your message. I'll assist you right away.",
        "I'm processing your request now.",
        "That's a good question. Let me find the information for you."
    ]
    return random.choice(responses)

# 模拟 Google Vision OCR
def google_vision_ocr(image_url):
    # 模拟 OCR 功能
    # 实际使用时应该调用真实的 Google Vision API
    return f"OCR result for {image_url}", 0.96

# 情绪和意图分析
def analyze_text(text):
    # 简化的情绪和意图识别
    text_lower = text.lower()
    
    # 情绪识别
    emotion = "neutral"
    if any(word in text_lower for word in ["urgent", "hurry", "quickly", "fast"]):
        emotion = "urgent"
    elif any(word in text_lower for word in ["please", "thank you", "thanks", "kindly"]):
        emotion = "polite"
    elif any(word in text_lower for word in ["angry", "bad", "terrible", "wrong", "issue"]):
        emotion = "angry"
    
    # 意图识别
    intent = "其他"
    if any(word in text_lower for word in ["price", "cost", "quote", "多少钱"]):
        intent = "询价"
    elif any(word in text_lower for word in ["delivery", "shipment", "arrival", "催货", "发货"]):
        intent = "催货"
    elif any(word in text_lower for word in ["complaint", "problem", "defect", "投诉", "问题"]):
        intent = "投诉"
    elif any(word in text_lower for word in ["how", "technical", "specification", "规格", "技术"]):
        intent = "技术咨询"
    elif any(word in text_lower for word in ["compare", "cheaper", "expensive", "比价", "便宜"]):
        intent = "比价"
    
    # 关键词提取
    keywords = []
    product_pattern = r"[A-Z0-9\-]+"
    products = re.findall(product_pattern, text)
    keywords.extend(products)
    
    sensor_keywords = ["sensor", "proximity", "photoelectric", "inductive", "接近", "光电", "电感"]
    for keyword in sensor_keywords:
        if keyword.lower() in text_lower:
            keywords.append(keyword)
    
    # 语言检测
    language = detect_language(text)
    
    return emotion, intent, keywords, language

# 产品推荐
def recommend_product(keywords, intent):
    products = load_products()
    
    # 默认推荐
    default_product = "E2E-X3D1-N"
    
    # 如果有关键词匹配产品ID
    for keyword in keywords:
        if keyword in products:
            return keyword, products[keyword]
    
    # 如果有传感器相关关键词，返回第一个传感器产品
    if any(word in " ".join(keywords).lower() for word in ["sensor", "接近", "光电", "电感"]):
        if products:
            first_product = list(products.keys())[0]
            return first_product, products[first_product]
    
    # 返回默认产品
    return default_product, products.get(default_product, {
        "type": "接近传感器",
        "distance": "2mm",
        "voltage": "12-24V DC",
        "output": "NPN",
        "brand": "OMRON"
    })

# API 路由

@app.route('/translate', methods=['POST', 'OPTIONS'])
@require_api_key
def translate():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                "status": "error",
                "message": "Missing text parameter",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 自动检测目标语言
        source_lang = detect_language(text)
        target_lang = "en" if source_lang == "zh" else "zh"
        
        # 执行翻译
        output, source_lang, target_lang = deepseek_translate(text, target_lang)
        
        result = {
            "status": "success",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "input": text,
            "output": output,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_message("translate", {"text": text}, f"{source_lang} → {target_lang}: {output[:50]}..." if len(output) > 50 else f"{source_lang} → {target_lang}: {output}")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"翻译接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route('/ocr', methods=['POST', 'OPTIONS'])
@require_api_key
def ocr():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        image_url = data.get('image_url', '')
        
        if not image_url:
            return jsonify({
                "status": "error",
                "message": "Missing image_url parameter",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 执行 OCR
        text, confidence = google_vision_ocr(image_url)
        
        result = {
            "status": "success",
            "text": text,
            "confidence": confidence,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_message("ocr", {"image_url": image_url}, f"confidence: {confidence}, text: {text[:50]}..." if len(text) > 50 else f"confidence: {confidence}, text: {text}")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"OCR接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route('/chat', methods=['POST', 'OPTIONS'])
@require_api_key
def chat():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        if not message:
            return jsonify({
                "status": "error",
                "message": "Missing message parameter",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 执行对话
        reply = deepseek_chat(message)
        
        result = {
            "status": "success",
            "reply": reply,
            "context_length": len(chat_context),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_message("chat", {"message": message}, f"reply: {reply[:50]}..." if len(reply) > 50 else f"reply: {reply}")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"对话接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route('/analyze', methods=['POST', 'OPTIONS'])
@require_api_key
def analyze():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                "status": "error",
                "message": "Missing text parameter",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 执行分析
        emotion, intent, keywords, language = analyze_text(text)
        
        result = {
            "status": "success",
            "emotion": emotion,
            "intent": intent,
            "keywords": keywords,
            "language": language,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_message("analyze", {"text": text}, f"intent: {intent}, emotion: {emotion}, keywords: {keywords}")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"分析接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route('/set_mode', methods=['POST', 'OPTIONS'])
@require_api_key
def set_mode():
    """设置AI/人工模式"""
    global current_mode
    
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        mode = data.get("mode", "AI").upper()
        
        if mode not in ["AI", "MANUAL"]:
            return jsonify({
                "status": "error",
                "error": "Invalid mode",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 只有模式改变时才记录
        if current_mode != mode:
            current_mode = mode
            log_mode_switch(mode)
        
        return jsonify({
            "status": "success",
            "mode": current_mode,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"设置模式接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route('/get_mode', methods=['GET', 'OPTIONS'])
@require_api_key
def get_mode():
    """获取当前模式"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    return jsonify({
        "status": "success",
        "mode": current_mode,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    })

# 健康检查端点 - 无需API密钥
@app.route('/ping', methods=['GET', 'OPTIONS'])
def ping():
    # 用于控制面板检测服务状态的端点
    return jsonify({
        'status': 'ok', 
        'message': 'AI service active',
        'version': '1.4.0'
    })

@app.route('/reply', methods=['POST', 'OPTIONS'])
@require_api_key
def reply():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json()
        source = data.get('source', '')
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                "status": "error",
                "message": "Missing text parameter",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 400
        
        # 检查当前模式，如果是人工模式，不执行自动回复
        if current_mode == "MANUAL":
            return jsonify({
                "status": "manual",
                "message": "当前为人工模式，未自动回复。",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }), 200
        
        # 1. 分析客户语气与意图
        emotion, intent, keywords, language = analyze_text(text)
        
        # 2. 翻译客户消息
        translated_text = text
        if language == "en":
            translated_text, _, _ = deepseek_translate(text, "zh")
        elif language == "zh":
            translated_text, _, _ = deepseek_translate(text, "en")
        
        # 3. 根据结果生成推荐
        product_id = ""
        product_attrs = {}
        
        if intent in ["询价", "技术咨询"]:
            product_id, product_attrs = recommend_product(keywords, intent)
        
        # 构建推荐对象
        recommendation = {
            "product": product_id,
            "attributes": product_attrs
        }
        
        # 4. 生成自然语言最终回复
        # 基于情绪、意图和产品信息构建提示
        prompt_parts = [
            f"客户情绪: {emotion}",
            f"客户意图: {intent}"
        ]
        
        if product_id:
            prompt_parts.append(f"推荐产品: {product_id} ({product_attrs.get('type', '')})")
            prompt_parts.append(f"产品属性: 检测距离 {product_attrs.get('distance', '')}, 电压 {product_attrs.get('voltage', '')}, 输出 {product_attrs.get('output', '')}")
        
        prompt_parts.append(f"客户消息: {text}")
        prompt_parts.append("请生成专业、友好的英文回复，包含产品信息和价格($8 per piece)")
        
        prompt = " ".join(prompt_parts)
        auto_reply = deepseek_chat(prompt)
        
        # 如果没有生成回复，使用默认回复
        if not auto_reply or auto_reply.startswith("I understand"):
            if product_id:
                auto_reply = f"This {product_attrs.get('type', 'sensor')} ({product_id}) is ideal for {product_attrs.get('distance', '')} detection, {product_attrs.get('voltage', '')}, {product_attrs.get('output', '')} type. Price $8 per piece."
            else:
                auto_reply = "Thank you for your inquiry. Could you please specify which product you are interested in?"
        
        result = {
            "status": "success",
            "customer_emotion": emotion,
            "intent": intent,
            "recommendation": recommendation,
            "translated": translated_text,
            "auto_reply": auto_reply,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_message("reply", {"source": source, "text": text}, f"推荐: {product_id} → 回复: {auto_reply[:50]}..." if len(auto_reply) > 50 else f"推荐: {product_id} → 回复: {auto_reply}")
        
        # 添加模式信息到结果中
        result["mode"] = current_mode
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        log_error(f"回复接口错误: {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }), 500

# CORS 中间件
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Content-Type', 'application/json; charset=utf-8')
    return response

# 命令行处理（兼容旧版调用）
def handle_cli():
    if len(sys.argv) < 2:
        # 没有参数时启动服务器
        return False
    
    command = sys.argv[1]
    
    if command == "translate" and len(sys.argv) > 2:
        text = ' '.join(sys.argv[2:])
        success, result = True, deepseek_translate(text)[0]
        if success:
            print(result)
        else:
            print(result, file=sys.stderr)
        return True
    
    elif command == "ocr" and len(sys.argv) > 2:
        image_path = sys.argv[2]
        success, result = True, google_vision_ocr(image_path)[0]
        if success:
            print(result)
        else:
            print(result, file=sys.stderr)
        return True
    
    return False

# 主函数
def main():
    # 先尝试处理命令行参数
    if handle_cli():
        return
    
    # 启动服务器
    products_loaded = "loaded" if os.path.exists(PRODUCTS_FILE) else "not found"
    print(f"🧠 JEV AI Service active on port {PORT}")
    print(f"✅ Endpoints ready: /translate /ocr /chat /reply /analyze /set_mode /get_mode")
    print(f"✅ Current mode: {current_mode}")
    print(f"✅ Log file: {LOG_FILE}")
    print(f"✅ Product attribute mapping: data/products.json {products_loaded}")
    print(f"🔐 Auth key loaded: {JEV_API_KEY}")
    
    # 启动 Flask 服务器
    app.run(host='0.0.0.0', port=PORT, threaded=True)

if __name__ == "__main__":
    main()