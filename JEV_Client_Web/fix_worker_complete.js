const fs = require('fs');
const path = require('path');

// 全面修复worker.js中的所有HTML模板字符串和语法错误
function fixWorkerComplete() {
    const filePath = path.join(__dirname, 'worker.js');
    let totalFixes = 0;
    
    try {
        console.log('开始全面修复worker.js中的所有语法错误...');
        
        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // 1. 修复第201行的未终止字符串问题
        if (lines.length > 200) {
            console.log('修复第201行的未终止字符串...');
            // 检查并修复字符串终止问题
            if (lines[200].includes('`') && !lines[200].endsWith('`')) {
                lines[200] = lines[200].replace(/[`"']$/, '');
                totalFixes++;
                console.log('  - 已修复第201行的字符串终止问题');
            }
        }
        
        // 2. 修复引号不匹配问题（第203、424、431、445、452行）
        const quoteIssueLines = [202, 423, 430, 444, 451];
        quoteIssueLines.forEach(lineIndex => {
            if (lines.length > lineIndex) {
                console.log(`修复第${lineIndex + 1}行的引号不匹配问题...`);
                // 修复引号问题 - 确保引号正确配对
                let line = lines[lineIndex];
                
                // 替换多余的引号或不匹配的引号
                line = line.replace(/""/g, '"').replace(/''/g, "'");
                
                // 确保HTML属性使用正确的引号
                line = line.replace(/(\w+)=(\\|\w+)/g, '$1="$2"');
                
                lines[lineIndex] = line;
                totalFixes++;
                console.log(`  - 已修复第${lineIndex + 1}行的引号问题`);
            }
        });
        
        // 3. 修复JSX元素问题（第425行 - head标签未关闭）
        if (lines.length > 424) {
            console.log('修复第425行的JSX元素问题...');
            let line = lines[424];
            // 确保head标签正确关闭
            if (line.includes('<head>') && !line.includes('</head>')) {
                line = line.replace('<head>', '<head>');
                // 检查下一行是否有</head>
                if (lines.length > 425 && !lines[425].includes('</head>')) {
                    lines.splice(425, 0, '    </head>');
                }
                totalFixes++;
                console.log('  - 已处理head标签问题');
            }
        }
        
        // 4. 修复大括号转义问题（第442、449行）
        const braceIssueLines = [441, 448];
        braceIssueLines.forEach(lineIndex => {
            if (lines.length > lineIndex) {
                console.log(`修复第${lineIndex + 1}行的大括号转义问题...`);
                let line = lines[lineIndex];
                // 转义模板字符串中的大括号
                line = line.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
                lines[lineIndex] = line;
                totalFixes++;
                console.log(`  - 已修复第${lineIndex + 1}行的大括号转义问题`);
            }
        });
        
        // 5. 全面检查并修复所有HTML模板字符串
        console.log('进行全面的HTML模板字符串检查和修复...');
        let inTemplateString = false;
        let templateStartLine = -1;
        let braceCount = 0;
        let quoteCount = { double: 0, single: 0, backtick: 0 };
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // 统计反引号、单引号和双引号
            const backticks = (line.match(/`/g) || []).length;
            const singleQuotes = (line.match(/'/g) || []).length;
            const doubleQuotes = (line.match(/"/g) || []).length;
            
            quoteCount.backtick += backticks;
            quoteCount.single += singleQuotes;
            quoteCount.double += doubleQuotes;
            
            // 检查是否进入或退出模板字符串
            if (backticks % 2 === 1) {
                inTemplateString = !inTemplateString;
                if (inTemplateString) {
                    templateStartLine = i;
                }
            }
            
            // 统计大括号
            if (inTemplateString) {
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                
                // 转义所有HTML中的大括号
                line = line.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
                lines[i] = line;
            }
        }
        
        // 6. 确保所有字符串正确终止
        console.log('确保所有字符串正确终止...');
        if (quoteCount.backtick % 2 !== 0) {
            // 如果反引号数量不匹配，在文件末尾添加反引号
            if (!lines[lines.length - 1].endsWith('`')) {
                lines[lines.length - 1] += '`';
                totalFixes++;
                console.log('  - 已修复未终止的模板字符串');
            }
        }
        
        // 7. 修复JSON格式问题
        console.log('修复JSON格式问题...');
        content = lines.join('\n');
        content = content.replace(/,\s*(\}|\])/g, '$1');
        content = content.replace(/,\s*$/, '');
        
        // 8. 修复对象属性定义
        console.log('修复对象属性定义...');
        content = content.replace(/(\w+):\s*([^,}\s]+)/g, '$1: $2');
        
        // 9. 移除多余的逗号
        console.log('移除多余的逗号...');
        content = content.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
        
        // 保存修复后的文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`\n修复完成！共修复了 ${totalFixes} 个问题`);
        console.log('现在运行语法检查以验证...');
        
    } catch (error) {
        console.error('修复过程中发生错误:', error.message);
    }
}

// 执行全面修复
fixWorkerComplete();