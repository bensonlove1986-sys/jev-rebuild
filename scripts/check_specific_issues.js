const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    console.log('详细检查特定问题...');
    console.log('==================================');
    
    const lines = data.split('\n');
    
    // 1. 检查未定义变量的上下文
    console.log('\n[1] 检查未定义变量的上下文:');
    checkVariableContext(lines, 3496, 'jevChatOnlyBtn');
    checkVariableContext(lines, 3507, 'jevConfigBtn');
    checkVariableContext(lines, 3510, 'jevWebhookSecretInput');
    checkVariableContext(lines, 3511, 'jevAutoPushInput');
    checkVariableContext(lines, 3512, 'jevChatOnlyInput');
    checkVariableContext(lines, 3513, 'jevChatRootSelInput');
    checkVariableContext(lines, 3514, 'jevInputSelInput');
    checkVariableContext(lines, 3518, 'jevSettingsDiv');
    
    // 2. 检查translate属性重复定义
    console.log('\n[2] 检查translate属性重复定义:');
    findDuplicateProperty(lines, 'translate');
    
    // 3. 检查try-catch不匹配问题
    console.log('\n[3] 检查try-catch不匹配:');
    // 这里简化处理，实际需要更复杂的嵌套分析
    console.log('  需要详细的嵌套分析来定位具体的不匹配try-catch块');
    
    // 4. 检查空的catch块
    console.log('\n[4] 查找空的catch块:');
    findEmptyCatchBlocks(data, lines);
    
    // 5. 检查其他常见逻辑问题
    console.log('\n[5] 检查其他逻辑问题:');
    checkOtherLogicIssues(lines);
    
    console.log('==================================');
    console.log('详细分析完成！');
});

// 检查变量上下文
function checkVariableContext(lines, lineNum, variableName) {
    const start = Math.max(0, lineNum - 5);
    const end = Math.min(lines.length, lineNum + 5);
    
    console.log(`\n  变量 ${variableName} 在第${lineNum}行附近:`);
    for (let i = start; i < end; i++) {
        const line = lines[i];
        const isTargetLine = (i + 1) === lineNum;
        console.log(`    ${isTargetLine ? '→' : ' '}${i + 1}: ${line}`);
        
        // 检查是否有变量声明
        if (line.includes(`const ${variableName}`) || 
            line.includes(`let ${variableName}`) || 
            line.includes(`var ${variableName}`)) {
            console.log(`    ✅  在第${i + 1}行发现${variableName}的声明`);
        }
    }
}

// 查找重复属性
function findDuplicateProperty(lines, propertyName) {
    let count = 0;
    console.log(`  查找属性 ${propertyName} 的所有定义:`);
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(new RegExp(`${propertyName}\s*:`))) {
            count++;
            console.log(`    第${i + 1}行: ${lines[i].trim()}`);
        }
    }
    
    if (count > 1) {
        console.log(`  ⚠️  属性 ${propertyName} 总共定义了 ${count} 次`);
    }
}

// 查找空的catch块
function findEmptyCatchBlocks(data, lines) {
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*{\s*}/g;
    let match;
    let count = 0;
    
    while ((match = emptyCatchPattern.exec(data)) !== null) {
        count++;
        const matchText = match[0];
        const matchIndex = match.index;
        
        // 计算行号
        const linesBefore = data.substring(0, matchIndex).split('\n');
        const lineNum = linesBefore.length;
        
        console.log(`  第${lineNum}行发现空的catch块: ${matchText}`);
    }
    
    if (count === 0) {
        console.log('  未发现空的catch块');
    }
}

// 检查其他逻辑问题
function checkOtherLogicIssues(lines) {
    // 检查条件判断中的赋值而不是比较
    console.log('  检查条件判断中的赋值操作:');
    let assignmentInConditionCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 检测 if (x = y) 模式，但排除 if (x == y) 和 if (x === y)
        if (line.match(/if\s*\([^=]+=[^=]/) && 
            !line.match(/if\s*\([^=]+==[^=]/) && 
            !line.match(/if\s*\([^=]+===/)) {
            assignmentInConditionCount++;
            console.log(`    第${i + 1}行可能存在赋值而非比较: ${line.trim()}`);
        }
    }
    
    if (assignmentInConditionCount === 0) {
        console.log('  未发现条件判断中的赋值操作');
    }
    
    // 检查死代码
    console.log('\n  检查可能的死代码:');
    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes('return') && !lines[i].includes('function') && 
            !lines[i].includes('=>') && !lines[i].includes('if') && 
            !lines[i].trim().startsWith('//') && 
            lines[i + 1].trim() && !lines[i + 1].trim().startsWith('//')) {
            console.log(`    第${i + 1}行后的代码可能无法执行: ${lines[i].trim()}`);
            console.log(`      下一行: ${lines[i + 1].trim()}`);
        }
    }
    
    // 检查函数参数不一致
    console.log('\n  检查函数参数可能不一致:');
    checkFunctionParameters(lines);
}

// 检查函数参数
function checkFunctionParameters(lines) {
    const functions = {};
    
    // 收集函数定义
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcDefMatch = line.match(/function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
        if (funcDefMatch) {
            const funcName = funcDefMatch[1];
            const params = funcDefMatch[2].split(',').map(p => p.trim()).filter(p => p);
            functions[funcName] = { params, line: i + 1 };
        }
    }
    
    // 检查常见的函数调用不一致
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcCallMatch = line.match(/([a-zA-Z0-9_$]+)\s*\(/);
        if (funcCallMatch) {
            const funcName = funcCallMatch[1];
            if (functions[funcName] && functions[funcName].params.length > 0) {
                // 简化检查：如果函数定义有参数，但调用看起来没有参数
                if (line.includes(`${funcName}()`)) {
                    console.log(`    第${i + 1}行: 函数 ${funcName} 定义时需要参数，但调用时没有提供`);
                }
            }
        }
    }
}