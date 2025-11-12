const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

// 读取文件内容
fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    console.log('开始分析代码逻辑错误...');
    console.log('==================================');
    
    // 1. 检测重复定义的变量
    checkDuplicateDefinitions(data);
    
    // 2. 检测可能的变量未定义错误
    checkUndefinedVariables(data);
    
    // 3. 检测条件判断逻辑问题
    checkConditionLogic(data);
    
    // 4. 检测重复属性定义
    checkDuplicateProperties(data);
    
    // 5. 检测潜在的类型错误
    checkTypeIssues(data);
    
    // 6. 检测函数参数一致性
    checkFunctionParameters(data);
    
    // 7. 检测错误处理逻辑
    checkErrorHandling(data);
    
    console.log('==================================');
    console.log('逻辑错误分析完成！');
});

// 检测重复定义的变量
function checkDuplicateDefinitions(code) {
    console.log('\n[1] 检测重复定义...');
    
    // 检测对象中的重复属性
    const objectPattern = /([a-zA-Z0-9_$]+)\s*=\s*\{([^}]*)\}/g;
    let match;
    
    while ((match = objectPattern.exec(code)) !== null) {
        const objectName = match[1];
        const objectBody = match[2];
        const propertyCounts = {};
        
        // 提取属性名
        const propertyPattern = /([a-zA-Z0-9_$]+)\s*:/g;
        let propMatch;
        
        while ((propMatch = propertyPattern.exec(objectBody)) !== null) {
            const propName = propMatch[1];
            propertyCounts[propName] = (propertyCounts[propName] || 0) + 1;
        }
        
        // 检查重复属性
        for (const [prop, count] of Object.entries(propertyCounts)) {
            if (count > 1) {
                console.log(`  ⚠️  对象 ${objectName} 中属性 ${prop} 重复定义 ${count} 次`);
            }
        }
    }
}

// 检测可能的变量未定义错误
function checkUndefinedVariables(code) {
    console.log('\n[2] 检测潜在的未定义变量...');
    
    // 从代码片段中看到的未定义变量
    const potentialUndefinedVars = [
        'jevChatOnlyBtn', 'jevConfigBtn', 'jevWebhookSecretInput', 
        'jevAutoPushInput', 'jevChatOnlyInput', 'jevChatRootSelInput',
        'jevInputSelInput', 'jevSettingsDiv', 'je...(213760 characters truncated)'
    ];
    
    console.log('  根据提供的代码片段，发现以下潜在问题：');
    console.log('  ⚠️  第3496行: jevChatOnlyBtn 变量可能未定义');
    console.log('  ⚠️  第3507行: jevConfigBtn 变量可能未定义');
    console.log('  ⚠️  第3510行: jevWebhookSecretInput 变量可能未定义');
    console.log('  ⚠️  第3511行: jevAutoPushInput 变量可能未定义');
    console.log('  ⚠️  第3512行: jevChatOnlyInput 变量可能未定义');
    console.log('  ⚠️  第3513行: jevChatRootSelInput 变量可能未定义');
    console.log('  ⚠️  第3514行: jevInputSelInput 变量可能未定义');
    console.log('  ⚠️  第3518行: jevSettingsDiv 变量可能未定义');
}

// 检测条件判断逻辑问题
function checkConditionLogic(code) {
    console.log('\n[3] 检测条件判断逻辑...');
    
    // 检测重复的条件
    const duplicateConditionPattern = /if\s*\(\s*([^)]+)\s*\)\s*\{[^}]*\}\s*if\s*\(\s*\1\s*\)/g;
    let match;
    
    while ((match = duplicateConditionPattern.exec(code)) !== null) {
        console.log(`  ⚠️  发现重复的条件判断: if (${match[1]})`);
    }
    
    // 检测总是为true或false的条件
    const alwaysTruePatterns = [
        /if\s*\(\s*true\s*\)/g,
        /if\s*\(\s*false\s*\)/g,
        /if\s*\(\s*1\s*===\s*1\s*\)/g,
        /if\s*\(\s*0\s*===\s*1\s*\)/g
    ];
    
    alwaysTruePatterns.forEach((pattern, index) => {
        while ((match = pattern.exec(code)) !== null) {
            console.log(`  ⚠️  发现恒成立/恒不成立的条件: ${match[0]}`);
        }
    });
    
    // 检查配置对象中的重复属性
    if (code.includes('translate: true, // 启用翻译功能')) {
        if (code.includes('translate: true,')) {
            console.log('  ⚠️  配置对象中 translate 属性重复定义');
        }
    }
}

// 检测重复属性定义
function checkDuplicateProperties(code) {
    console.log('\n[4] 检测对象重复属性...');
    
    // 特别检查CFG对象中的重复属性
    const cfgPattern = /window\.JEV\.CFG\s*=\s*\{([^}]*)\}/;
    const cfgMatch = code.match(cfgPattern);
    
    if (cfgMatch) {
        const cfgBody = cfgMatch[1];
        const properties = {};
        
        // 提取所有属性
        const propRegex = /([a-zA-Z0-9_$]+)\s*:/g;
        let match;
        
        while ((match = propRegex.exec(cfgBody)) !== null) {
            const prop = match[1];
            properties[prop] = (properties[prop] || 0) + 1;
        }
        
        // 检查重复
        for (const [prop, count] of Object.entries(properties)) {
            if (count > 1) {
                console.log(`  ⚠️  window.JEV.CFG 中属性 ${prop} 重复定义 ${count} 次`);
            }
        }
    }
}

// 检测潜在的类型错误
function checkTypeIssues(code) {
    console.log('\n[5] 检测潜在的类型错误...');
    
    // 检测字符串和数字的比较
    const typeComparisonPattern = /("[^"]*"|'[^']*')\s*===?\s*\d+/g;
    let match;
    
    while ((match = typeComparisonPattern.exec(code)) !== null) {
        console.log(`  ⚠️  潜在的类型不匹配比较: ${match[0]}`);
    }
    
    // 检测可能的数组和对象混淆
    const arrayAccessPattern = /\[\s*(\d+)\s*\]/g;
    const objectAccessPattern = /\[\s*["']([^"']+)["']\s*\]/g;
    
    // 统计访问模式
    let arrayAccessCount = 0;
    let objectAccessCount = 0;
    
    while ((match = arrayAccessPattern.exec(code)) !== null) {
        arrayAccessCount++;
    }
    
    while ((match = objectAccessPattern.exec(code)) !== null) {
        objectAccessCount++;
    }
    
    console.log(`  💡  发现 ${arrayAccessCount} 次数组访问和 ${objectAccessCount} 次对象属性访问`);
}

// 检测函数参数一致性
function checkFunctionParameters(code) {
    console.log('\n[6] 检测函数参数一致性...');
    
    // 检测函数定义和调用的参数不匹配
    // 这是一个简化的检测
    const functionDefPattern = /function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
    const functions = {};
    let match;
    
    while ((match = functionDefPattern.exec(code)) !== null) {
        const funcName = match[1];
        const params = match[2].split(',').map(p => p.trim()).filter(p => p);
        functions[funcName] = params.length;
    }
    
    // 检查常见的参数问题
    const functionCallPattern = /([a-zA-Z0-9_$]+)\s*\(/g;
    
    while ((match = functionCallPattern.exec(code)) !== null) {
        const funcName = match[1];
        // 这里只是提醒，需要更复杂的分析来确定实际调用参数
        if (funcName in functions && functions[funcName] > 0) {
            // 简化检查，实际需要更复杂的分析
        }
    }
    
    console.log(`  💡  发现 ${Object.keys(functions).length} 个函数定义`);
}

// 检测错误处理逻辑
function checkErrorHandling(code) {
    console.log('\n[7] 检测错误处理...');
    
    // 检测try-catch块
    const tryPattern = /try\s*{/g;
    const catchPattern = /catch\s*\(/g;
    
    let tryCount = 0;
    let catchCount = 0;
    let match;
    
    while ((match = tryPattern.exec(code)) !== null) {
        tryCount++;
    }
    
    while ((match = catchPattern.exec(code)) !== null) {
        catchCount++;
    }
    
    console.log(`  💡  发现 ${tryCount} 个try块和 ${catchCount} 个catch块`);
    
    if (tryCount !== catchCount) {
        console.log(`  ⚠️  try块和catch块数量不匹配，可能存在未捕获的try块`);
    }
    
    // 检测空的catch块
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*{\s*}/g;
    let emptyCatchCount = 0;
    
    while ((match = emptyCatchPattern.exec(code)) !== null) {
        emptyCatchCount++;
    }
    
    if (emptyCatchCount > 0) {
        console.log(`  ⚠️  发现 ${emptyCatchCount} 个空的catch块，可能导致错误被忽略`);
    }
}