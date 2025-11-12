// JEV 编码全面修复工具 v3.0
// 针对关键文件的编码问题进行深度修复

const fs = require('fs');
const path = require('path');

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync('encoding_fix_log_v3.txt', logMessage + '\n');
}

// 修复文件编码
function fixFileEncoding(filePath) {
    try {
        // 读取文件（二进制方式）
        const buffer = fs.readFileSync(filePath);
        
        // 检测并移除BOM
        let content = buffer.toString('utf8');
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            log(`[移除BOM] ${filePath}`);
        }
        
        // 清理控制字符（保留换行和制表符）
        const cleanContent = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        if (cleanContent !== content) {
            log(`[清理控制字符] ${filePath}`);
        }
        
        // 修复meta charset标签
        let fixedContent = cleanContent;
        if (filePath.endsWith('.html')) {
            // 查找所有可能的charset声明并统一为UTF-8
            const charsetPattern = /<meta\s+charset=["']?([^"'>\s]+)["']?\s*>/i;
            const headPattern = /<head[^>]*>/i;
            
            if (charsetPattern.test(fixedContent)) {
                // 替换现有charset
                fixedContent = fixedContent.replace(charsetPattern, '<meta charset="UTF-8">');
                log(`[修复charset标签] ${filePath}`);
            } else if (headPattern.test(fixedContent)) {
                // 在head标签后添加charset
                fixedContent = fixedContent.replace(headPattern, '$&\n    <meta charset="UTF-8">');
                log(`[添加charset标签] ${filePath}`);
            }
        }
        
        // 保存为UTF-8无BOM
        fs.writeFileSync(filePath, fixedContent, { encoding: 'utf8', flag: 'w' });
        log(`[保存成功] ${filePath}`);
        
        return true;
    } catch (error) {
        log(`[修复失败] ${filePath}: ${error.message}`);
        return false;
    }
}

// 复制备份文件到原始位置
function restoreFromBackup(backupPath, originalPath) {
    try {
        if (fs.existsSync(backupPath)) {
            const content = fs.readFileSync(backupPath, 'utf8');
            fs.writeFileSync(originalPath, content, { encoding: 'utf8' });
            log(`[从备份恢复] ${originalPath} <- ${backupPath}`);
            return true;
        } else {
            log(`[备份不存在] ${backupPath}`);
            return false;
        }
    } catch (error) {
        log(`[恢复失败] ${backupPath} -> ${originalPath}: ${error.message}`);
        return false;
    }
}

// 检查文件大小
function checkFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch {
        return 0;
    }
}

// 主修复函数
function main() {
    log('=== JEV 编码修复工具 v3.0 开始执行 ===');
    
    // 创建日志文件
    fs.writeFileSync('encoding_fix_log_v3.txt', 'JEV 编码修复日志\n' + new Date().toISOString() + '\n\n');
    
    const criticalFiles = [
        // 关键HTML文件
        'd:\\PDF转网页\\JEV_Client\\ui\\panel.html',
        'd:\\PDF转网页\\JEV_Client\\ui\\client_portal.html',
        'd:\\PDF转网页\\JEV_Client\\ui\\sentinel_dashboard.html',
        'd:\\PDF转网页\\JEV_Client\\ui\\cognition_panel.html',
        
        // 关键JS文件
        'd:\\PDF转网页\\JEV_Client\\ui\\panel.js',
        'd:\\PDF转网页\\JEV_Client\\ui\\client_portal.js',
        'd:\\PDF转网页\\JEV_Client\\ui\\sentinel_dashboard.js',
        
        // 根目录文件
        'd:\\PDF转网页\\main.js',
        'd:\\PDF转网页\\jev_panel.js'
    ];
    
    // 尝试从备份恢复panel.js
    restoreFromBackup('d:\\PDF转网页\\JEV_Client\\backup\\encoding\\ui\\panel.js', 
                     'd:\\PDF转网页\\JEV_Client\\ui\\panel.js');
    
    // 尝试从备份恢复panel.html
    restoreFromBackup('d:\\PDF转网页\\JEV_Client\\backup\\encoding\\ui\\panel.html', 
                     'd:\\PDF转网页\\JEV_Client\\ui\\panel.html');
    
    // 修复所有关键文件
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of criticalFiles) {
        if (fs.existsSync(filePath)) {
            log(`[开始修复] ${filePath}`);
            const success = fixFileEncoding(filePath);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        } else {
            log(`[文件不存在] ${filePath}`);
            failCount++;
        }
    }
    
    // 扫描并修复JEV_Client/ui目录下的所有HTML文件
    const uiDir = 'd:\\PDF转网页\\JEV_Client\\ui';
    if (fs.existsSync(uiDir)) {
        log(`[扫描目录] ${uiDir} 下的所有HTML文件`);
        const htmlFiles = fs.readdirSync(uiDir).filter(file => file.endsWith('.html'));
        
        for (const htmlFile of htmlFiles) {
            const filePath = path.join(uiDir, htmlFile);
            log(`[开始修复] ${filePath}`);
            const success = fixFileEncoding(filePath);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
    }
    
    // 生成修复报告
    log('=== 修复完成 ===');
    log(`成功修复: ${successCount} 个文件`);
    log(`修复失败: ${failCount} 个文件`);
    
    // 创建测试页面
    const testPageContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>JEV 编码测试页面</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-text { font-size: 18px; margin: 20px 0; }
        .success { color: green; }
        .warning { color: orange; }
        .info { color: blue; }
    </style>
</head>
<body>
    <h1>JEV 编码测试页面</h1>
    <p class="info">如果您能正常看到下面的中文文本，说明编码设置正确。</p>
    
    <div class="test-text">
        <p>测试中文显示：你好，世界！这是一段测试文本。</p>
        <p>特殊字符测试：中文标点符号，！？；：「」『』（）《》</p>
        <p>Unicode测试：😊👍🎉✨</p>
    </div>
    
    <div class="success">
        <p>编码修复工具已运行完成。</p>
        <p>请清除浏览器缓存后重新打开您的应用程序。</p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('d:\\PDF转网页\\encoding_test_page.html', testPageContent, { encoding: 'utf8' });
    log('已生成编码测试页面: encoding_test_page.html');
    
    console.log('\n编码修复完成！请查看 encoding_fix_log_v3.txt 获取详细日志。');
    console.log('请访问 encoding_test_page.html 测试编码是否正常。');
}

// 执行修复
main();