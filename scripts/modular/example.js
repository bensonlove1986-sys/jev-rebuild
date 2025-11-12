/**
 * JEV模块化系统使用示例
 * 展示如何使用模块化后的组件
 */

// 导入方式1：导入整个JEV对象
import JEV from './index.js';

// 导入方式2：导入特定模块
import { app, config, logger, uploader, worker, ui, utils } from './index.js';

/**
 * 示例1：初始化JEV系统
 */
async function exampleInitialize() {
  console.log('=== 示例1：初始化JEV系统 ===');
  
  // 方式1：使用自动初始化（在index.js中已配置）
  // 自动初始化会在DOM加载完成后自动执行
  
  // 方式2：手动初始化（带自定义配置）
  const customConfig = {
    upload: {
      baseUrl: 'http://localhost:8000/upload',
      timeout: 30000,
      maxRetries: 3
    },
    worker: {
      mode: 'local',
      url: 'http://localhost:8000',
      timeout: 60000
    },
    ui: {
      theme: 'default'
    }
  };
  
  try {
    const success = await JEV.initialize(customConfig);
    if (success) {
      console.log('JEV初始化成功');
    } else {
      console.error('JEV初始化失败');
    }
  } catch (error) {
    console.error('JEV初始化出错:', error);
  }
}

/**
 * 示例2：处理图片
 */
async function exampleProcessImage() {
  console.log('=== 示例2：处理图片 ===');
  
  // 假设有一个File对象
  // const fileInput = document.getElementById('image-input');
  // const imageFile = fileInput.files[0];
  
  // 这里使用模拟数据
  const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/...';
  
  try {
    // 方式1：使用JEV对象
    const result1 = await JEV.processImage(mockImageData, {
      ocr: true,
      translate: true,
      quality: 0.9
    });
    
    console.log('图片处理结果1:', result1);
    
    // 方式2：直接使用app模块
    const result2 = await app.processImage(mockImageData, {
      ocr: true,
      translate: true,
      quality: 0.9
    });
    
    console.log('图片处理结果2:', result2);
    
  } catch (error) {
    console.error('图片处理出错:', error);
  }
}

/**
 * 示例3：文本翻译
 */
async function exampleTranslateText() {
  console.log('=== 示例3：文本翻译 ===');
  
  const textToTranslate = 'Hello, this is a test translation.';
  
  try {
    // 方式1：使用JEV对象
    const result1 = await JEV.translateText(textToTranslate, {
      from: 'en',
      to: 'zh-CN'
    });
    
    console.log('翻译结果1:', result1);
    
    // 方式2：直接使用app模块
    const result2 = await app.translateText(textToTranslate, {
      from: 'en',
      to: 'zh-CN'
    });
    
    console.log('翻译结果2:', result2);
    
  } catch (error) {
    console.error('文本翻译出错:', error);
  }
}

/**
 * 示例4：使用UI组件
 */
async function exampleUIComponents() {
  console.log('=== 示例4：使用UI组件 ===');
  
  try {
    // 创建输入对话框
    const inputResult = await JEV.ui.createInputDialog({
      title: '示例输入',
      placeholder: '请输入一些文本',
      defaultValue: '默认值',
      validate: (value) => {
        if (!value.trim()) {
          return '输入不能为空';
        }
        return true;
      }
    });
    
    console.log('输入对话框结果:', inputResult);
    
    // 创建命令执行对话框
    const command = 'echo "Hello JEV" | ConvertTo-Json';
    const commandResult = await JEV.ui.createCommandDialog({
      title: '执行命令示例',
      command: command
    });
    
    console.log('命令对话框结果:', commandResult);
    
  } catch (error) {
    console.error('UI组件使用出错:', error);
  }
}

/**
 * 示例5：上传文件
 */
async function exampleUpload() {
  console.log('=== 示例5：上传文件 ===');
  
  // 假设有一个File对象
  // const fileInput = document.getElementById('file-input');
  // const file = fileInput.files[0];
  
  // 这里使用模拟数据
  const mockFile = new Blob(['Hello World'], { type: 'text/plain' });
  
  try {
    // 方式1：使用JEV对象
    const result1 = await JEV.upload.upload(mockFile, {
      baseUrl: 'http://localhost:8000/upload',
      timeout: 30000,
      maxRetries: 3
    });
    
    console.log('上传结果1:', result1);
    
    // 方式2：直接使用uploader模块
    const result2 = await uploader.upload(mockFile, {
      baseUrl: 'http://localhost:8000/upload',
      timeout: 30000,
      maxRetries: 3
    });
    
    console.log('上传结果2:', result2);
    
    // 获取上传统计
    const stats = uploader.getStats();
    console.log('上传统计:', stats);
    
  } catch (error) {
    console.error('文件上传出错:', error);
  }
}

/**
 * 示例6：使用Worker通信
 */
async function exampleWorkerCommunication() {
  console.log('=== 示例6：使用Worker通信 ===');
  
  try {
    // 调用Worker方法
    const result = await JEV.worker.callWorker('test', {
      message: 'Hello Worker'
    });
    
    console.log('Worker调用结果:', result);
    
    // 检查Worker状态
    const status = await worker.checkStatus();
    console.log('Worker状态:', status ? '可用' : '不可用');
    
  } catch (error) {
    console.error('Worker通信出错:', error);
  }
}

/**
 * 示例7：使用配置管理
 */
function exampleConfiguration() {
  console.log('=== 示例7：使用配置管理 ===');
  
  // 获取配置
  const uploadConfig = JEV.config.get('upload');
  console.log('上传配置:', uploadConfig);
  
  // 设置配置
  JEV.config.set('app.name', 'JEV Example');
  JEV.config.set('app.version', '1.0.0');
  
  // 批量更新配置
  JEV.config.update({
    debug: true,
    logLevel: 'info'
  });
  
  // 获取所有配置
  const allConfig = JEV.config.get();
  console.log('所有配置:', allConfig);
}

/**
 * 示例8：使用日志系统
 */
function exampleLogging() {
  console.log('=== 示例8：使用日志系统 ===');
  
  // 不同级别的日志
  JEV.logger.debug('这是一条调试日志');
  JEV.logger.info('这是一条信息日志');
  JEV.logger.warn('这是一条警告日志');
  JEV.logger.error('这是一条错误日志');
  
  // 带元数据的日志
  JEV.logger.info('带元数据的日志', {
    userId: 'test123',
    action: 'example'
  });
}

/**
 * 示例9：使用工具函数
 */
function exampleUtils() {
  console.log('=== 示例9：使用工具函数 ===');
  
  // HTML转义
  const escaped = JEV.utils.escapeHtml('<script>alert("XSS");</script>');
  console.log('HTML转义结果:', escaped);
  
  // 生成唯一ID
  const id = JEV.utils.generateUniqueId();
  console.log('生成的唯一ID:', id);
  
  // URL验证
  const isValid = JEV.utils.isValidUrl('https://example.com');
  console.log('URL验证结果:', isValid);
  
  // 重试函数
  const retryExample = async () => {
    let attempts = 0;
    
    const result = await JEV.utils.retry(async () => {
      attempts++;
      console.log(`尝试 ${attempts}`);
      if (attempts < 3) {
        throw new Error('故意失败');
      }
      return '成功！';
    }, {
      maxRetries: 5,
      delay: 1000
    });
    
    console.log('重试结果:', result);
  };
  
  retryExample();
}

/**
 * 示例10：创建统一窗口
 */
function exampleCreateWindow() {
  console.log('=== 示例10：创建统一窗口 ===');
  
  // 创建JEV统一窗口
  const windowElement = JEV.createUnifiedWindow();
  if (windowElement) {
    console.log('统一窗口创建成功');
  } else {
    console.error('统一窗口创建失败');
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('开始运行JEV模块化系统示例...');
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      executeExamples();
    });
  } else {
    executeExamples();
  }
}

/**
 * 执行示例
 */
async function executeExamples() {
  // 按照依赖顺序运行示例
  await exampleInitialize();
  
  // 这些示例可以根据需要取消注释
  // await exampleProcessImage();
  // await exampleTranslateText();
  // await exampleUIComponents();
  // await exampleUpload();
  // await exampleWorkerCommunication();
  
  exampleConfiguration();
  exampleLogging();
  exampleUtils();
  exampleCreateWindow();
  
  console.log('所有示例运行完成');
}

// 导出示例函数，方便在其他地方使用
export {
  exampleInitialize,
  exampleProcessImage,
  exampleTranslateText,
  exampleUIComponents,
  exampleUpload,
  exampleWorkerCommunication,
  exampleConfiguration,
  exampleLogging,
  exampleUtils,
  exampleCreateWindow,
  runAllExamples
};

// 如果直接运行此脚本，则执行所有示例
if (typeof document !== 'undefined') {
  runAllExamples();
}