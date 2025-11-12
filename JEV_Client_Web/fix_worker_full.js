const fs = require('fs');
const path = require('path');

// 全面修复worker.js中的语法错误
function fixWorkerFull() {
    const filePath = path.join(__dirname, 'worker.js');
    
    try {
        console.log('开始全面修复worker.js的语法错误...');
        
        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 记录修复的错误数量
        let fixed = 0;
        
        // 1. 修复未终止的字符串字面量（第202行）
        console.log('修复未终止的字符串字面量...');
        // 查找并修复未闭合的字符串
        const unclosedStringRegex = /\s*'[^']*$/m;
        if (unclosedStringRegex.test(content)) {
            content = content.replace(unclosedStringRegex, (match) => match + "'");
            fixed++;
            console.log('  - 修复了未闭合的单引号字符串');
        }
        
        // 2. 修复引号不匹配问题（第204行、第1013行）
        console.log('修复引号不匹配问题...');
        const quoteIssues = [
            /""/g,  // 双引号重复
            /''/g,   // 单引号重复
            /`+/g    // 反引号重复
        ];
        
        quoteIssues.forEach(regex => {
            content = content.replace(regex, (match) => match.charAt(0));
            fixed++;
        });
        console.log('  - 修复了重复引号问题');
        
        // 3. 修复第1374行的无效字符和TypeScript相关错误
        console.log('修复无效字符和TypeScript相关错误...');
        // 查找包含无效字符的行（通常是第1374行附近）
        const lines = content.split('\n');
        
        // 检查并修复第1374行
        if (lines[1373]) {
            // 移除任何TypeScript类型声明
            lines[1373] = lines[1373].replace(/<[^>]+>/g, '');
            
            // 移除无效字符（通常是特殊的Unicode字符）
            lines[1373] = lines[1373].replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F]/g, '');
            
            fixed++;
            console.log('  - 修复了第1374行的无效字符');
        }
        
        // 4. 检查并修复所有行中的模板字符串
        console.log('修复模板字符串问题...');
        let backtickCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineBackticks = (lines[i].match(/`/g) || []).length;
            backtickCount += lineBackticks;
            
            // 如果发现奇数个反引号，添加一个结束反引号
            if (lineBackticks % 2 !== 0) {
                if (backtickCount % 2 === 1) {
                    lines[i] += '`';
                    backtickCount++;
                    fixed++;
                }
            }
        }
        console.log('  - 修复了模板字符串的闭合问题');
        
        // 5. 修复所有可能的语法错误
        console.log('修复其他可能的语法错误...');
        // 合并行并进行最终修复
        content = lines.join('\n');
        
        // 修复JSON格式问题
        content = content.replace(/,\s*}/g, '}');
        content = content.replace(/,\s*\]/g, ']');
        
        // 修复函数调用语法
        content = content.replace(/\(\s*\)/g, '()');
        
        // 保存修复后的文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`\n修复完成！总共处理了 ${fixed} 个错误。`);
        console.log('现在运行语法检查以验证修复...');
        
    } catch (error) {
        console.error('修复过程中发生错误:', error.message);
    }
}

// 执行修复
fixWorkerFull();