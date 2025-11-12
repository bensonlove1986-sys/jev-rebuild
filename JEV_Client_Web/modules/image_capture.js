// JEV 图片捕获与分析模块
class JEVImageCapture {
  constructor() {
    this.fileInput = null;
    this.previewArea = null;
    this.uploadButton = null;
    this.resultArea = null;
    this.statusArea = null;
    this.currentImage = null;
  }

  init() {
    this.loadElements();
    this.setupEventListeners();
    console.log('JEV 图片捕获模块已初始化');
  }

  loadElements() {
    this.fileInput = document.getElementById('image-upload');
    this.previewArea = document.getElementById('image-preview');
    this.uploadButton = document.getElementById('upload-button');
    this.resultArea = document.getElementById('recognition-result');
    this.statusArea = document.getElementById('upload-status');
  }

  setupEventListeners() {
    if (this.fileInput) {
      this.fileInput.addEventListener('change', this.handleFileSelection.bind(this));
    }
    
    if (this.uploadButton) {
      this.uploadButton.addEventListener('click', this.handleUpload.bind(this));
    }
  }

  handleFileSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      this.showStatus('请选择有效的图片文件', 'error');
      return;
    }

    // 预览图片
    const reader = new FileReader();
    reader.onload = (event) => {
      this.previewArea.innerHTML = `
        <img src="${event.target.result}" alt="预览图片" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
      `;
      this.currentImage = file;
      this.uploadButton.disabled = false;
      this.showStatus('图片已选择，点击上传进行分析', 'info');
    };
    reader.readAsDataURL(file);
  }

  async handleUpload() {
    if (!this.currentImage) {
      this.showStatus('请先选择一张图片', 'error');
      return;
    }

    this.showStatus('正在上传并分析图片...', 'info');
    this.resultArea.textContent = '分析中...';
    this.uploadButton.disabled = true;

    try {
      const formData = new FormData();
      formData.append('image', this.currentImage);
      
      const token = localStorage.getItem('token');
      if (!token) {
        this.redirectToLogin();
        return;
      }

      const response = await fetch('/api/jev/analyze-image', {
        method: 'POST',
        headers: {
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.status === 401) {
        this.redirectToLogin();
        return;
      }

      const result = await response.json();

      if (result.success) {
        this.displayRecognitionResult(result.data);
        this.showStatus('图片分析完成', 'success');
      } else {
        this.showStatus(result.message || '分析失败', 'error');
        this.resultArea.textContent = '分析失败，请重试';
      }
    } catch (error) {
      console.error('图片上传错误:', error);
      this.showStatus('网络错误，请重试', 'error');
      this.resultArea.textContent = '上传失败，请检查网络连接';
    } finally {
      this.uploadButton.disabled = false;
    }
  }

  displayRecognitionResult(data) {
    if (!this.resultArea) return;

    // 格式化识别结果
    let resultHtml = '<div class="recognition-results">';
    
    if (data.model) {
      resultHtml += `<div class="result-item"><strong>识别模型:</strong> ${data.model}</div>`;
    }
    
    if (data.brand) {
      resultHtml += `<div class="result-item"><strong>品牌:</strong> ${data.brand}</div>`;
    }
    
    if (data.modelNumber) {
      resultHtml += `<div class="result-item"><strong>型号:</strong> ${data.modelNumber}</div>`;
    }
    
    if (data.quantity) {
      resultHtml += `<div class="result-item"><strong>数量:</strong> ${data.quantity}</div>`;
    }
    
    if (data.details) {
      resultHtml += `<div class="result-item"><strong>详细信息:</strong> ${data.details}</div>`;
    }
    
    // 显示置信度
    if (data.confidence !== undefined) {
      resultHtml += `<div class="result-item confidence"><strong>置信度:</strong> ${(data.confidence * 100).toFixed(1)}%</div>`;
    }
    
    resultHtml += '</div>';
    this.resultArea.innerHTML = resultHtml;

    // 添加样式
    this.addResultStyles();
  }

  addResultStyles() {
    // 确保只添加一次样式
    if (document.getElementById('result-styles')) return;

    const style = document.createElement('style');
    style.id = 'result-styles';
    style.textContent = `
      .recognition-results {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
      }
      .result-item {
        margin-bottom: 8px;
        font-size: 14px;
      }
      .result-item strong {
        color: #333;
        margin-right: 8px;
      }
      .result-item.confidence {
        color: #4CAF50;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  showStatus(message, type) {
    if (!this.statusArea) return;
    
    this.statusArea.textContent = message;
    this.statusArea.className = `status ${type}`;
  }

  redirectToLogin() {
    localStorage.removeItem('token');
    window.location.href = '/ui/login_portal.html';
  }
}

// 初始化图片捕获模块
document.addEventListener('DOMContentLoaded', () => {
  const imageCapture = new JEVImageCapture();
  imageCapture.init();
});