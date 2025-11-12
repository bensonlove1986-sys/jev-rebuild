// JEV HTML编码全面修复工具
// 修复所有HTML文件的编码问题，确保UTF-8无BOM格式

const fs = require('fs');
const path = require('path');

// 确保logs目录存在
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 日志文件
const logFile = path.join(logDir, `html_encoding_fix_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
}

log('开始JEV HTML编码全面修复');

// 要修复的HTML文件列表
const htmlFiles = [
    path.join(__dirname, 'ui', 'client_portal.html'),
    path.join(__dirname, 'ui', 'sentinel_dashboard.html'),
    path.join(__dirname, 'ui', 'cognition_panel.html'),
    path.join(__dirname, 'ui', 'login_portal.html'),
    path.join(__dirname, 'ui', 'invite_admin.html'),
    path.join(__dirname, 'ui', 'meta_panel.html')
];

// 修复单个HTML文件
function fixHtmlFile(filePath) {
    try {
        log(`处理文件: ${filePath}`);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            log(`警告: 文件不存在 ${filePath}`);
            return false;
        }
        
        // 创建备份
        const backupPath = `${filePath}.bak_${new Date().getTime()}`;
        fs.copyFileSync(filePath, backupPath);
        log(`已创建备份: ${backupPath}`);
        
        // 读取文件内容（使用utf8编码，自动处理BOM）
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 移除BOM（如果存在）
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            log('已移除UTF-8 BOM');
        }
        
        // 修复meta charset标签
        const originalContent = content;
        content = content.replace(/<meta\s+charset=["\']?[^"\'>\s]+["\']?\s*>/gi, '<meta charset="UTF-8">');
        
        // 如果没有charset标签，在head中添加
        if (!content.match(/<meta\s+charset=["\']UTF-8["\']/gi)) {
            content = content.replace(/(<head[^>]*>)/i, '$1\n    <meta charset="UTF-8">');
            log('已添加meta charset="UTF-8"标签');
        }
        
        // 移除控制字符（除了换行、回车和制表符）
        content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        log('已移除控制字符');
        
        // 清理明显的乱码模式
        const garbagePatterns = [
            /Kt\+4%pWۉ.*?/g,
            /GU-[0-9A-Za-z]+.*?/g,
            /[^\x00-\x7F]{5,}/g  // 连续5个以上的非ASCII字符
        ];
        
        garbagePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                log(`检测到 ${matches.length} 个可能的乱码模式`);
                content = content.replace(pattern, '');
            }
        });
        
        // 保存为UTF-8无BOM格式
        fs.writeFileSync(filePath, content, { encoding: 'utf8' });
        log(`文件已保存为UTF-8无BOM格式: ${filePath}`);
        
        // 验证文件大小
        const originalSize = fs.statSync(backupPath).size;
        const newSize = fs.statSync(filePath).size;
        
        if (newSize < 100 || newSize > originalSize * 2) {
            log(`警告: 文件大小异常 (${newSize} bytes)，可能修复不完整`);
            return false;
        }
        
        log(`文件修复成功: ${filePath}`);
        return true;
    } catch (error) {
        log(`修复失败: ${filePath} - ${error.message}`);
        return false;
    }
}

// 修复所有HTML文件
let successCount = 0;
let failedCount = 0;

for (const file of htmlFiles) {
    const result = fixHtmlFile(file);
    if (result) {
        successCount++;
    } else {
        failedCount++;
    }
}

// 创建测试HTML文件来验证修复效果
function createTestHtml() {
    try {
        const testHtmlPath = path.join(__dirname, 'encoding_test.html');
        const testHtmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>编码测试页面</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        .test-text { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
        .success { color: green; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <h1>JEV 编码测试页面</h1>
    
    <div class="test-text">
        <h2>ASCII字符测试</h2>
        <p>Hello, World! This is a test.</p>
    </div>
    
    <div class="test-text">
        <h2>中文字符测试</h2>
        <p>你好，世界！这是一个测试页面。</p>
    </div>
    
    <div class="test-text">
        <h2>特殊字符测试</h2>
        <p>!@#$%^&*()_+{}[]:;"'<>,.?/|\ 测试</p>
    </div>
    
    <div class="test-text success">
        <p>如果您能正确看到以上所有文本，说明编码设置正确。</p>
    </div>
    
    <div class="footer">
        <p>修复统计: 成功 ${successCount} 个文件, 失败 ${failedCount} 个文件</p>
        <p>生成时间: ${new Date().toLocaleString()}</p>
    </div>
    
    <script>
        console.log('编码测试页面已加载');
        console.log('当前字符集:', document.characterSet);
    </script>
</body>
</html>`;

        fs.writeFileSync(testHtmlPath, testHtmlContent, { encoding: 'utf8' });
        log(`已创建编码测试页面: ${testHtmlPath}`);
    } catch (error) {
        log(`创建测试页面失败: ${error.message}`);
    }
}

createTestHtml();

// 生成修复报告
const reportPath = path.join(logDir, 'html_encoding_fix_report.txt');
const reportContent = `
===== JEV HTML编码修复报告 =====
修复时间: ${new Date().toLocaleString()}

修复统计:
成功: ${successCount} 个文件
失败: ${failedCount} 个文件

修复文件列表:
${htmlFiles.map(file => path.basename(file)).join('\n')}

修复操作:
1. 移除BOM字符
2. 修复/添加meta charset="UTF-8"标签
3. 移除控制字符
4. 清理潜在乱码
5. 保存为UTF-8无BOM格式

验证:
- 已创建编码测试页面: encoding_test.html
- 请访问 http://localhost:8080/encoding_test.html 验证编码修复效果

注意事项:
1. 所有原始文件都已创建备份（.bak_时间戳）
2. 修复日志已保存至: ${path.basename(logFile)}
3. 建议清除浏览器缓存后访问页面（Ctrl+F5强制刷新）
`;

fs.writeFileSync(reportPath, reportContent);
log(`修复报告已生成: ${reportPath}`);
log(`编码修复完成: 成功 ${successCount} 个文件, 失败 ${failedCount} 个文件`);
log('请运行 jev_start.bat 启动服务，然后访问 http://localhost:8080 验证修复效果');
