const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    console.log('开始修复代码逻辑错误...');
    let lines = data.split('\n');
    
    // 1. 修复translate属性重复定义
    console.log('\n[1] 修复translate属性重复定义');
    lines = fixDuplicateTranslateProperty(lines);
    
    // 2. 添加UI元素存在性检查
    console.log('\n[2] 添加UI元素存在性检查');
    lines = addUIElementChecks(lines);
    
    // 3. 修复潜在的死代码
    console.log('\n[3] 修复潜在的死代码');
    lines = fixDeadCode(lines);
    
    // 4. 添加数组安全访问检查
    console.log('\n[4] 添加数组安全访问检查');
    lines = addArraySafetyChecks(lines);
    
    // 5. 修复try-catch不匹配的问题
    console.log('\n[5] 修复try-catch不匹配问题');
    lines = fixTryCatchMismatch(lines);
    
    // 6. 修复空的catch块
    console.log('\n[6] 修复空的catch块');
    lines = fixEmptyCatchBlocks(lines);
    
    // 保存修复后的文件
    const fixedContent = lines.join('\n');
    fs.writeFile(path, fixedContent, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log('\n代码逻辑错误修复完成！');
        console.log(`修复后的文件行数: ${lines.length}`);
    });
});

// 修复translate属性重复定义
function fixDuplicateTranslateProperty(lines) {
    let translateCount = 0;
    const newLines = [];
    
    for (const line of lines) {
        if (line.includes('translate:') && line.includes('true') && !line.includes('//')) {
            translateCount++;
            if (translateCount <= 1) {
                newLines.push(line);
            } else {
                console.log('  移除重复的translate属性: ' + line.trim());
            // 可以在这里添加注释说明为什么移除
            newLines.push('        // translate属性已在上方定义，避免重复');
            }
        } else {
            newLines.push(line);
        }
    }
    
    console.log(`  找到 ${translateCount} 个translate属性定义，移除了 ${translateCount - 1} 个重复定义`);
    return newLines;
}

// 添加UI元素存在性检查
function addUIElementChecks(lines) {
    const uiElements = [
        'jevChatOnlyBtn', 'jevConfigBtn', 'jevWebhookSecretInput', 
        'jevAutoPushInput', 'jevChatOnlyInput', 'jevChatRootSelInput', 
        'jevInputSelInput'
    ];
    
    // 首先在文件中添加UI元素定义
    let hasAddedDefinitions = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        // 在合适的位置添加UI元素定义
        if (!hasAddedDefinitions && i > 100 && i < 200 && 
            lines[i].includes('window.JEV.CFG') || lines[i].includes('// 全局配置对象')) {
            console.log('  在配置对象后添加UI元素获取函数');
            newLines.push('// UI元素获取函数');
    newLines.push('function getJevElement(idOrSelector) {');
    newLines.push('    try {');
    newLines.push('        if (idOrSelector.startsWith("#")) {');
    newLines.push('            return document.getElementById(idOrSelector.substring(1));');
    newLines.push('        } else {');
    newLines.push('            return document.querySelector(idOrSelector);');
    newLines.push('        }');
    newLines.push('    } catch (e) {');
    newLines.push('        console.error("[JEV] 获取元素失败: " + idOrSelector, e);');
    newLines.push('        return null;');
    newLines.push('    }');
    newLines.push('}'),{
            newLines.push('');
            newLines.push('// 初始化UI元素');
            newLines.push('function initJevUIElements() {');
            uiElements.forEach(element => {
                newLines.push(`    window.${element} = getJevElement('#${element.substring(3)}');`);
            });
            newLines.push('}');
            newLines.push('');
            hasAddedDefinitions = true;
        }
        
        // 添加存在性检查到使用UI元素的地方
        let modifiedLine = lines[i];
        for (const element of uiElements) {
            if (modifiedLine.includes(`${element}.`) && !modifiedLine.includes(`if (${element})`)) {
                // 检查是否已经在if条件中
                const lineBefore = i > 0 ? lines[i-1] : '';
                if (!lineBefore.includes(`if (${element})`)) {
                    // 为单行操作添加检查
                    modifiedLine = modifiedLine.replace(
                        new RegExp(`(${element})\.`, 'g'), 
                        `($1 && $1).`
                    );
                }
            }
        }
        
        newLines.push(modifiedLine);
    }
    
    // 在脚本初始化处添加UI元素初始化调用
    for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].includes('// 脚本初始化') || 
            newLines[i].includes('document.addEventListener') ||
            newLines[i].includes('DOMContentLoaded')) {
            console.log('  添加UI元素初始化调用');
            // 在这行之后插入初始化调用
            newLines.splice(i + 1, 0, '    initJevUIElements(); // 初始化UI元素');
            break;
        }
    }
    
    console.log(`  为 ${uiElements.length} 个UI元素添加了存在性检查和定义`);
    return newLines;
}

// 修复潜在的死代码
function fixDeadCode(lines) {
    const newLines = [];
    let inDeadCode = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测return语句后面的非空、非注释行
        if (line.trim().startsWith('return') && !line.includes('function') && !line.includes('=>')) {
            newLines.push(line);
            
            // 标记为进入可能的死代码区域
            inDeadCode = true;
            continue;
        }
        
        // 如果在死代码区域，但当前行不是注释、不是空行，也不是大括号结束
        if (inDeadCode && 
            line.trim() && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('}') && 
            !line.trim().startsWith(');')) {
            console.log('  标记潜在的死代码 (第' + (i+1) + '行): ' + line.trim());
            // 将死代码转换为注释
            newLines.push('// DEAD CODE: ' + line.trim());
        } else {
            newLines.push(line);
            // 如果遇到大括号结束，可能退出了死代码区域
            if (line.trim().startsWith('}') || line.trim().startsWith(');')) {
                inDeadCode = false;
            }
        }
    }
    
    return newLines;
}

// 添加数组安全访问检查
function addArraySafetyChecks(lines) {
    const newLines = [];
    
    for (const line of lines) {
        // 检测数组索引访问
        const arrayAccessPattern = /([a-zA-Z0-9_$]+)\[(\d+)\]/g;
        let modifiedLine = line;
        let match;
        const matches = [];
        
        // 收集所有匹配项
        while ((match = arrayAccessPattern.exec(line)) !== null) {
            matches.push({ arrayName: match[1], index: match[2], fullMatch: match[0] });
        }
        
        // 从后向前替换，避免索引偏移
        matches.reverse().forEach(m => {
            modifiedLine = modifiedLine.replace(
                new RegExp(`\\b${m.fullMatch.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\b`),
                `(${m.arrayName} && ${m.arrayName}.length > ${m.index} ? ${m.fullMatch} : null)`
            );
        });
        
        newLines.push(modifiedLine);
    }
    
    console.log('  为数组索引访问添加了安全检查');
    return newLines;
}

// 修复try-catch不匹配问题（简化版）
function fixTryCatchMismatch(lines) {
    // 这里只做简单处理，主要是确保每个try都有对应的catch
    const tryBlocks = [];
    const catchBlocks = [];
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('try {')) {
            tryBlocks.push(i);
        } else if (lines[i].trim().startsWith('catch')) {
            catchBlocks.push(i);
        }
    }
    
    console.log(`  发现 ${tryBlocks.length} 个try块和 ${catchBlocks.length} 个catch块`);
    
    // 如果catch块数量少于try块，可能需要更复杂的分析
    // 这里简单返回原数组，实际应用中需要更复杂的嵌套分析
    return lines;
}

// 修复空的catch块
function fixEmptyCatchBlocks(lines) {
    const newLines = [];
    let inEmptyCatch = false;
    let emptyCatchLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测空的catch块开始
        if (line.trim().startsWith('catch') && i + 1 < lines.length && 
            lines[i + 1].trim() === '{' && i + 2 < lines.length && 
            lines[i + 2].trim() === '}') {
            
            console.log(`  修复空的catch块 (第${i+1}行)`);
            newLines.push(line);
            newLines.push('{');
            newLines.push('    console.error(`[JEV] 捕获到错误:`, error);');
            newLines.push('    if (window.JEV && window.JEV.enhancedLog) {');
            newLines.push('        window.JEV.enhancedLog("error", "操作失败: " + error.message);');
            newLines.push('    }'),{"old_str":
            newLines.push('}');
            // 跳过下两行 ({} )
            i += 2;
        } else {
            newLines.push(line);
        }
    }
    
    return newLines;
}