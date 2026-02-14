// 从DOM元素提取文字
export const extractTextFromElement = (element: Element): string => {
  // 过滤掉脚本和样式元素
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
    return '';
  }
  
  // 获取元素文本
  let text = element.textContent || '';
  
  // 清理文本
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

// 使用Canvas捕获图片
export const captureScreenshot = (image: HTMLImageElement): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    // 创建Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(canvas);
      return;
    }
    
    // 设置Canvas尺寸
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    
    // 绘制图片
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    resolve(canvas);
  });
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
  let lastCall = 0;
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// 检查元素是否可见
export const isElementVisible = (element: Element): boolean => {
  return element.offsetParent !== null;
};

// 获取元素的绝对位置和尺寸
export const getElementRect = (element: Element): DOMRect => {
  return element.getBoundingClientRect();
};

// 压缩图片
export const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.7): string => {
  return canvas.toDataURL('image/jpeg', quality);
};

// 提取页面所有文字
export const extractAllText = (document: Document): string => {
  return extractTextFromElement(document.body);
};

// 提取页面所有图片
export const extractAllImages = (document: Document): HTMLImageElement[] => {
  const images = document.querySelectorAll('img');
  return Array.from(images).filter((img) => isElementVisible(img)) as HTMLImageElement[];
};
