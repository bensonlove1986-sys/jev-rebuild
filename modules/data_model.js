// JEV插件整合项目 - 统一数据模型

// 初始化JEV命名空间
window.JEV = window.JEV || {};

/**
 * 数据模型管理器，用于定义和验证模块间的统一JSON数据格式
 */
class DataModelManager {
    constructor() {
        // 定义数据模式
        this.schema = {
            // 地址处理请求数据格式
            addressProcessRequest: {
                type: 'object',
                required: ['addressNode'],
                properties: {
                    addressNode: {
                        type: 'object',
                        description: '包含地址信息的DOM节点'
                    },
                    options: {
                        type: 'object',
                        description: '处理选项',
                        properties: {
                            targetLanguage: {
                                type: 'string',
                                description: '目标翻译语言代码',
                                default: 'en'
                            },
                            enableOCR: {
                                type: 'boolean',
                                description: '是否启用OCR识别',
                                default: true
                            },
                            enableTranslation: {
                                type: 'boolean',
                                description: '是否启用翻译',
                                default: true
                            },
                            enableAIProcessing: {
                                type: 'boolean',
                                description: '是否启用AI处理',
                                default: true
                            }
                        }
                    }
                }
            },
            
            // 统一处理数据格式
            processingData: {
                type: 'object',
                properties: {
                    // 地址信息
                    address: {
                        type: 'string',
                        description: '提取的地址文本'
                    },
                    
                    // OCR识别文本
                    text: {
                        type: 'string',
                        description: 'OCR识别的文本'
                    },
                    
                    // 翻译结果
                    translation: {
                        type: 'string',
                        description: '翻译后的文本'
                    },
                    
                    // AI响应
                    aiResponse: {
                        type: 'string',
                        description: 'AI系统的响应'
                    },
                    
                    // 处理时间统计
                    processingTimes: {
                        type: 'object',
                        properties: {
                            bolo: {
                                type: 'number',
                                description: 'BOLO提取处理时间（毫秒）'
                            },
                            ocr: {
                                type: 'number',
                                description: 'OCR识别处理时间（毫秒）'
                            },
                            translation: {
                                type: 'number',
                                description: '翻译处理时间（毫秒）'
                            },
                            ai: {
                                type: 'number',
                                description: 'AI处理时间（毫秒）'
                            }
                        }
                    },
                    
                    // 总处理时间
                    totalProcessingTime: {
                        type: 'number',
                        description: '总处理时间（毫秒）'
                    },
                    
                    // 错误信息
                    errors: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: '处理过程中的错误信息'
                    },
                    
                    // 元数据
                    metadata: {
                        type: 'object',
                        properties: {
                            requestId: {
                                type: 'string',
                                description: '请求唯一ID'
                            },
                            timestamp: {
                                type: 'number',
                                description: '处理时间戳'
                            },
                            moduleVersions: {
                                type: 'object',
                                description: '各模块版本信息'
                            }
                        }
                    }
                }
            },
            
            // BOLO提取结果格式
            boloResult: {
                type: 'object',
                required: ['success'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: '提取是否成功'
                    },
                    address: {
                        type: 'string',
                        description: '提取的地址'
                    },
                    confidence: {
                        type: 'number',
                        description: '提取置信度（0-1）'
                    },
                    error: {
                        type: 'string',
                        description: '错误信息'
                    },
                    processingTime: {
                        type: 'number',
                        description: '处理时间（毫秒）'
                    },
                    extractedComponents: {
                        type: 'object',
                        description: '提取的地址组件',
                        properties: {
                            country: { type: 'string' },
                            province: { type: 'string' },
                            city: { type: 'string' },
                            district: { type: 'string' },
                            street: { type: 'string' },
                            number: { type: 'string' },
                            postalCode: { type: 'string' }
                        }
                    }
                }
            },
            
            // OCR识别结果格式
            ocrResult: {
                type: 'object',
                required: ['success'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: '识别是否成功'
                    },
                    text: {
                        type: 'string',
                        description: '识别的文本'
                    },
                    confidence: {
                        type: 'number',
                        description: '识别置信度（0-1）'
                    },
                    error: {
                        type: 'string',
                        description: '错误信息'
                    },
                    processingTime: {
                        type: 'number',
                        description: '处理时间（毫秒）'
                    },
                    textBlocks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' },
                                confidence: { type: 'number' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        x: { type: 'number' },
                                        y: { type: 'number' },
                                        width: { type: 'number' },
                                        height: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            
            // 翻译结果格式
            translationResult: {
                type: 'object',
                required: ['success'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: '翻译是否成功'
                    },
                    translation: {
                        type: 'string',
                        description: '翻译后的文本'
                    },
                    sourceLanguage: {
                        type: 'string',
                        description: '源语言代码'
                    },
                    targetLanguage: {
                        type: 'string',
                        description: '目标语言代码'
                    },
                    error: {
                        type: 'string',
                        description: '错误信息'
                    },
                    processingTime: {
                        type: 'number',
                        description: '处理时间（毫秒）'
                    }
                }
            },
            
            // AI处理结果格式
            aiResult: {
                type: 'object',
                required: ['success'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: 'AI处理是否成功'
                    },
                    response: {
                        type: 'string',
                        description: 'AI的响应'
                    },
                    confidence: {
                        type: 'number',
                        description: '响应置信度（0-1）'
                    },
                    error: {
                        type: 'string',
                        description: '错误信息'
                    },
                    processingTime: {
                        type: 'number',
                        description: '处理时间（毫秒）'
                    },
                    additionalInfo: {
                        type: 'object',
                        description: '额外信息'
                    }
                }
            },
            
            // 处理统计信息格式
            processingStats: {
                type: 'object',
                properties: {
                    boloTime: {
                        type: 'number',
                        description: 'BOLO模块平均处理时间'
                    },
                    ocrTime: {
                        type: 'number',
                        description: 'OCR模块平均处理时间'
                    },
                    translationTime: {
                        type: 'number',
                        description: '翻译模块平均处理时间'
                    },
                    aiTime: {
                        type: 'number',
                        description: 'AI模块平均处理时间'
                    },
                    requestCount: {
                        type: 'number',
                        description: '总请求数'
                    },
                    successRate: {
                        type: 'number',
                        description: '成功率'
                    }
                }
            }
        };
        
        // 初始化日志
        console.log('[Data Model] Manager initialized');
    }
    
    /**
     * 验证数据是否符合指定模式
     * @param {string} modelName - 模式名称
     * @param {object} data - 要验证的数据
     * @returns {object} 验证结果
     */
    validate(modelName, data) {
        if (!this.schema[modelName]) {
            return {
                valid: false,
                error: `Unknown model: ${modelName}`
            };
        }
        
        const schema = this.schema[modelName];
        const validationErrors = [];
        
        // 检查数据类型
        if (typeof data !== schema.type) {
            validationErrors.push(`Expected type ${schema.type}, got ${typeof data}`);
            return {
                valid: false,
                errors: validationErrors
            };
        }
        
        // 如果是对象类型，检查必需属性
        if (schema.type === 'object' && schema.required) {
            schema.required.forEach(prop => {
                if (data[prop] === undefined) {
                    validationErrors.push(`Required property missing: ${prop}`);
                }
            });
        }
        
        // 检查属性类型
        if (schema.type === 'object' && schema.properties) {
            Object.keys(schema.properties).forEach(prop => {
                const propSchema = schema.properties[prop];
                const value = data[prop];
                
                // 如果值存在，检查类型
                if (value !== undefined && value !== null) {
                    const isValid = this.validatePropertyType(value, propSchema);
                    if (!isValid.valid) {
                        validationErrors.push(`Property '${prop}': ${isValid.error}`);
                    }
                }
            });
        }
        
        return {
            valid: validationErrors.length === 0,
            errors: validationErrors
        };
    }
    
    /**
     * 验证单个属性类型
     */
    validatePropertyType(value, schema) {
        // 数组类型检查
        if (schema.type === 'array' && schema.items) {
            if (!Array.isArray(value)) {
                return { valid: false, error: `Expected array, got ${typeof value}` };
            }
            
            // 检查数组元素类型
            for (let i = 0; i < value.length; i++) {
                const itemResult = this.validatePropertyType(value[i], schema.items);
                if (!itemResult.valid) {
                    return { valid: false, error: `Array item ${i}: ${itemResult.error}` };
                }
            }
            return { valid: true };
        }
        
        // 对象类型检查
        if (schema.type === 'object' && schema.properties) {
            if (typeof value !== 'object' || value === null) {
                return { valid: false, error: `Expected object, got ${typeof value}` };
            }
            
            // 递归检查对象属性
            Object.keys(schema.properties).forEach(prop => {
                if (value[prop] !== undefined) {
                    const propResult = this.validatePropertyType(value[prop], schema.properties[prop]);
                    if (!propResult.valid) {
                        return { valid: false, error: `Property '${prop}': ${propResult.error}` };
                    }
                }
            });
            return { valid: true };
        }
        
        // 基本类型检查
        if (typeof value !== schema.type) {
            return { valid: false, error: `Expected ${schema.type}, got ${typeof value}` };
        }
        
        return { valid: true };
    }
    
    /**
     * 创建符合模式的数据模板
     * @param {string} modelName - 模式名称
     * @returns {object} 数据模板
     */
    createTemplate(modelName) {
        if (!this.schema[modelName]) {
            console.error(`[Data Model] Unknown model: ${modelName}`);
            return null;
        }
        
        return this.createTemplateFromSchema(this.schema[modelName]);
    }
    
    /**
     * 从模式创建模板
     */
    createTemplateFromSchema(schema) {
        if (schema.type === 'object') {
            const template = {};
            if (schema.properties) {
                Object.keys(schema.properties).forEach(prop => {
                    const propSchema = schema.properties[prop];
                    if (propSchema.default !== undefined) {
                        template[prop] = propSchema.default;
                    } else {
                        template[prop] = this.createTemplateFromSchema(propSchema);
                    }
                });
            }
            return template;
        }
        
        if (schema.type === 'array') {
            return [];
        }
        
        // 基本类型默认值
        switch (schema.type) {
            case 'string':
                return '';
            case 'number':
                return 0;
            case 'boolean':
                return false;
            default:
                return null;
        }
    }
    
    /**
     * 格式化处理数据
     * @param {object} data - 处理数据
     * @returns {object} 格式化后的数据
     */
    formatProcessingData(data) {
        const template = this.createTemplate('processingData');
        
        // 确保metadata存在
        if (!data.metadata) {
            data.metadata = {};
        }
        
        // 生成请求ID（如果不存在）
        if (!data.metadata.requestId) {
            data.metadata.requestId = this.generateRequestId();
        }
        
        // 设置时间戳
        if (!data.metadata.timestamp) {
            data.metadata.timestamp = Date.now();
        }
        
        // 合并数据
        const formatted = { ...template, ...data };
        
        // 确保processingTimes存在
        if (!formatted.processingTimes) {
            formatted.processingTimes = {};
        }
        
        // 确保errors存在
        if (!formatted.errors) {
            formatted.errors = [];
        }
        
        // 计算总处理时间
        if (!formatted.totalProcessingTime && formatted.processingTimes) {
            formatted.totalProcessingTime = Object.values(formatted.processingTimes)
                .filter(time => typeof time === 'number')
                .reduce((sum, time) => sum + time, 0);
        }
        
        return formatted;
    }
    
    /**
     * 生成请求ID
     * @returns {string} 请求ID
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 规范化数据格式
     * @param {string} modelName - 模式名称
     * @param {object} data - 要规范化的数据
     * @returns {object} 规范化后的数据
     */
    normalize(modelName, data) {
        const validation = this.validate(modelName, data);
        if (!validation.valid) {
            console.warn(`[Data Model] Data validation warnings for ${modelName}:`, validation.errors);
            // 创建一个有效的模板
            const template = this.createTemplate(modelName);
            // 合并数据，但确保所有必需字段都存在
            return { ...template, ...data };
        }
        return data;
    }
    
    /**
     * 获取数据模型的文档说明
     * @param {string} modelName - 模式名称
     * @returns {object} 文档对象
     */
    getDocumentation(modelName) {
        if (!this.schema[modelName]) {
            return null;
        }
        
        return {
            name: modelName,
            description: this.schema[modelName].description || 'No description',
            requiredProperties: this.schema[modelName].required || [],
            properties: this.getPropertiesDocumentation(this.schema[modelName].properties || {})
        };
    }
    
    /**
     * 获取属性文档
     */
    getPropertiesDocumentation(properties) {
        const docs = {};
        Object.keys(properties).forEach(prop => {
            const propSchema = properties[prop];
            docs[prop] = {
                type: propSchema.type,
                description: propSchema.description || 'No description',
                required: false // 这里需要额外处理required
            };
        });
        return docs;
    }
    
    /**
     * 导出所有数据模型文档
     * @returns {object} 所有模型的文档
     */
    exportDocumentation() {
        const docs = {};
        Object.keys(this.schema).forEach(modelName => {
            docs[modelName] = this.getDocumentation(modelName);
        });
        return docs;
    }
}

// 创建全局实例
window.dataModel = new DataModelManager();

// 注册到JEV控制器
if (window.JEV && window.JEV.Controller) {
    JEV.Controller.registerModule('dataModel', {
        onInit: () => console.log('[Data Model] Registered with controller'),
        validate: (modelName, data) => dataModel.validate(modelName, data),
        createTemplate: (modelName) => dataModel.createTemplate(modelName),
        formatProcessingData: (data) => dataModel.formatProcessingData(data),
        normalize: (modelName, data) => dataModel.normalize(modelName, data),
        getDocumentation: (modelName) => dataModel.getDocumentation(modelName),
        exportDocumentation: () => dataModel.exportDocumentation()
    });
}