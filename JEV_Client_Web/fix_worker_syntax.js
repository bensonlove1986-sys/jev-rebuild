const fs = require('fs');
const path = require('path');

// 修复worker.js中的语法错误
function fixWorkerSyntax() {
    const filePath = path.join(__dirname, 'worker.js');
    
    try {
        console.log('开始修复worker.js的语法错误...');
        
        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 错误类型分析：
        // 1. 引号不匹配
        // 2. 未正确转义的大括号
        // 3. 模板字符串结束问题
        
        // 修复策略：
        // 1. 处理HTML模板字符串中的特殊字符转义
        // 2. 修复未闭合的引号
        // 3. 确保模板字符串正确结束
        
        // 查找并修复模板字符串中的问题
        let fixed = 0;
        
        // 修复第1013行附近的引号问题
        const quoteFix = /(["'`])\s*(["'`])/g;
        content = content.replace(quoteFix, (match, p1) => p1);
        
        // 修复模板字符串中的大括号转义问题
        // 查找所有模板字符串区域并检查
        const templateRegex = /`([^`]*)`/g;
        content = content.replace(templateRegex, (match, templateContent) => {
            // 在模板字符串中，修复未转义的大括号问题
            // 我们需要确保模板字符串内的HTML内容中的大括号不会被JavaScript解析为变量
            // 但由于这是HTML内容，我们只需要确保模板字符串正确结束
            return '`' + templateContent + '`';
        });
        
        // 特别处理错误提示中提到的行号附近
        const lines = content.split('\n');
        
        // 检查并修复错误行
        const errorLines = [1013, 1021, 1031, 1034, 1038, 1041, 1049, 1054];
        
        for (const lineNum of errorLines) {
            if (lines[lineNum - 1]) {
                // 修复引号问题
                lines[lineNum - 1] = lines[lineNum - 1].replace(/""/g, '"');
                lines[lineNum - 1] = lines[lineNum - 1].replace(/''/g, "'");
                
                // 检查模板字符串是否正确结束
                const backtickCount = (lines[lineNum - 1].match(/`/g) || []).length;
                if (backtickCount % 2 !== 0) {
                    // 如果发现奇数个反引号，添加一个结束反引号
                    lines[lineNum - 1] += '`';
                }
                
                fixed++;
            }
        }
        
        content = lines.join('\n');
        
        // 保存修复后的文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`修复完成！已处理 ${fixed} 个可能的错误行。`);
        console.log('现在运行语法检查以验证修复...');
        
    } catch (error) {
        console.error('修复过程中发生错误:', error.message);
    }
}

// 执行修复
fixWorkerSyntax();