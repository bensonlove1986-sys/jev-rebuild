const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    console.log('分析UI事件处理和交互逻辑...');
    console.log('==================================');
    
    const lines = data.split('\n');
    
    // 1. 检查UI元素变量定义
    console.log('\n[1] UI元素变量检查:');
    const uiElements = [
        'jevChatOnlyBtn', 'jevConfigBtn', 'jevWebhookSecretInput', 
        'jevAutoPushInput', 'jevChatOnlyInput', 'jevChatRootSelInput', 
        'jevInputSelInput', 'jevSettingsDiv'
    ];
    
    uiElements.forEach(element => {
        checkUIElementDefinition(lines, element);
    });
    
    // 2. 检查事件监听器注册
    console.log('\n[2] 事件监听器检查:');
    checkEventListeners(lines);
    
    // 3. 检查UI更新逻辑
    console.log('\n[3] UI更新逻辑检查:');
    checkUIUpdateLogic(lines);
    
    // 4. 检查配置对象
    console.log('\n[4] 配置对象检查:');
    checkConfigObjects(lines);
    
    // 5. 检查数据流处理
    console.log('\n[5] 数据流处理检查:');
    checkDataFlow(lines);
    
    // 6. 边界条件检查
    console.log('\n[6] 边界条件处理检查:');
    checkBoundaryConditions(lines);
    
    // 7. 异步操作处理
    console.log('\n[7] 异步操作处理检查:');
    checkAsyncOperations(lines);
    
    console.log('==================================');
    console.log('UI和交互逻辑分析完成！');
});

// 检查UI元素是否被定义
function checkUIElementDefinition(lines, elementName) {
    let isDefined = false;
    let definitionLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 检查是否有定义或获取该元素的代码
        if ((line.includes(`const ${elementName}`) || 
             line.includes(`let ${elementName}`) || 
             line.includes(`var ${elementName}`)) && 
            !line.includes(`if (${elementName})`)) {
            isDefined = true;
            definitionLines.push(i + 1);
        }
        
        // 检查是否通过getElementById等方法获取
        if (line.includes(`${elementName} = document.getElementById`) ||
            line.includes(`${elementName} = document.querySelector`) ||
            line.includes(`${elementName} = document.getElementById`)) {
            isDefined = true;
            definitionLines.push(i + 1);
        }
    }
    
    if (isDefined) {
        console.log(`  ✅ ${elementName} 在以下行定义: ${definitionLines.join(', ')}`);
    } else {
        console.log(`  ⚠️ ${elementName} 没有找到定义，可能是动态创建或未定义`);
    }
}

// 检查事件监听器
function checkEventListeners(lines) {
    const eventPattern = /addEventListener|on\w+=/g;
    let eventCount = 0;
    let potentialIssues = [];
    
    for (let i = 0; i < lines.length; i++) {
        if (eventPattern.test(lines[i])) {
            eventCount++;
            
            // 检查潜在问题
            if (lines[i].includes('addEventListener') && !lines[i].includes('function') && !lines[i].includes('=>')) {
                potentialIssues.push(`第${i + 1}行: 事件处理函数可能未正确定义`);
            }
            
            // 检查是否有移除监听器的代码（防止内存泄漏）
            const handlerName = lines[i].match(/\('(\w+)'\s*,\s*([^)]+)\)/);
            if (handlerName) {
                let hasRemoveListener = false;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].includes('removeEventListener') && 
                        lines[j].includes(handlerName[1])) {
                        hasRemoveListener = true;
                        break;
                    }
                }
                if (!hasRemoveListener && eventCount % 10 === 0) { // 只报告一部分以避免输出过多
                    potentialIssues.push(`第${i + 1}行: 可能缺少对应的removeEventListener`);
                }
            }
        }
        eventPattern.lastIndex = 0; // 重置正则表达式状态
    }
    
    console.log(`  发现 ${eventCount} 个事件监听器`);
    if (potentialIssues.length > 0) {
        console.log('  潜在问题:');
        potentialIssues.slice(0, 5).forEach(issue => console.log(`    ${issue}`));
        if (potentialIssues.length > 5) {
            console.log(`    ... 还有 ${potentialIssues.length - 5} 个潜在问题`);
        }
    }
}

// 检查UI更新逻辑
function checkUIUpdateLogic(lines) {
    const uiUpdatePatterns = [
        /\.style\./g,
        /\.innerHTML\s*=/g,
        /\.textContent\s*=/g,
        /\.value\s*=/g,
        /\.classList\./g,
        /\.setAttribute\(/g
    ];
    
    let updateCount = 0;
    let potentialIssues = [];
    
    for (let i = 0; i < lines.length; i++) {
        let hasUpdate = false;
        
        for (const pattern of uiUpdatePatterns) {
            if (pattern.test(lines[i])) {
                updateCount++;
                hasUpdate = true;
                pattern.lastIndex = 0;
                break;
            }
        }
        
        if (hasUpdate) {
            // 检查是否缺少null检查
            if ((lines[i].includes('.innerHTML') || 
                 lines[i].includes('.textContent') || 
                 lines[i].includes('.value')) &&
                !lines[i].includes('if') && !lines[i].includes('&&') && !lines[i].includes('?')) {
                potentialIssues.push(`第${i + 1}行: 可能缺少元素存在性检查`);
            }
        }
    }
    
    console.log(`  发现 ${updateCount} 处UI更新操作`);
    if (potentialIssues.length > 0) {
        console.log('  潜在的UI更新问题:');
        potentialIssues.slice(0, 5).forEach(issue => console.log(`    ${issue}`));
    }
}

// 检查配置对象
function checkConfigObjects(lines) {
    const configPatterns = [
        /JEV\.CFG/g,
        /window\.JEV\.CFG/g,
        /JEV\.STATE/g,
        /window\.JEV\.STATE/g
    ];
    
    let configAccessCount = 0;
    let potentialIssues = [];
    
    for (let i = 0; i < lines.length; i++) {
        let hasConfigAccess = false;
        
        for (const pattern of configPatterns) {
            if (pattern.test(lines[i])) {
                configAccessCount++;
                hasConfigAccess = true;
                pattern.lastIndex = 0;
                break;
            }
        }
        
        if (hasConfigAccess && lines[i].includes('=')) {
            // 检查是否直接修改配置而没有同步到存储
            if (!lines[i].includes('store') && !lines[i].includes('save')) {
                if (potentialIssues.length < 5) {
                    potentialIssues.push(`第${i + 1}行: 可能缺少配置同步操作`);
                }
            }
        }
    }
    
    console.log(`  发现 ${configAccessCount} 处配置对象访问`);
    if (potentialIssues.length > 0) {
        console.log('  潜在的配置管理问题:');
        potentialIssues.forEach(issue => console.log(`    ${issue}`));
    }
}

// 检查数据流处理
function checkDataFlow(lines) {
    const dataProcessingPatterns = [
        /parseInt/g,
        /parseFloat/g,
        /JSON\.parse/g,
        /JSON\.stringify/g,
        /\.split\(/g,
        /\.join\(/g,
        /\.map\(/g,
        /\.filter\(/g
    ];
    
    let dataProcessCount = 0;
    let errorHandlingCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        for (const pattern of dataProcessingPatterns) {
            if (pattern.test(lines[i])) {
                dataProcessCount++;
                
                // 检查是否有错误处理
                let hasErrorHandling = false;
                // 向前和向后查找try-catch
                for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
                    if (lines[j].includes('try') || lines[j].includes('catch')) {
                        hasErrorHandling = true;
                        errorHandlingCount++;
                        break;
                    }
                }
                
                pattern.lastIndex = 0;
                break;
            }
        }
    }
    
    console.log(`  发现 ${dataProcessCount} 处数据处理操作`);
    console.log(`  其中 ${errorHandlingCount} 处有错误处理`);
    const coverage = dataProcessCount > 0 ? Math.round((errorHandlingCount / dataProcessCount) * 100) : 0;
    console.log(`  错误处理覆盖率: ${coverage}%`);
    
    if (coverage < 50) {
        console.log('  ⚠️  数据处理的错误处理覆盖率较低，可能导致运行时错误');
    }
}

// 检查边界条件
function checkBoundaryConditions(lines) {
    console.log('  常见边界条件检查:');
    
    // 检查数组访问边界
    let arrayAccessCount = 0;
    let safeAccessCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const arrayAccessMatches = lines[i].match(/\[\d+\]/g);
        if (arrayAccessMatches) {
            arrayAccessCount += arrayAccessMatches.length;
            
            // 检查是否有长度检查或安全访问
            if (lines[i].includes('length') || 
                lines[i].includes('?') || 
                lines[i].includes('&&')) {
                safeAccessCount += arrayAccessMatches.length;
            }
        }
    }
    
    console.log(`  数组索引访问: ${arrayAccessCount} 处，其中安全访问: ${safeAccessCount} 处`);
    
    // 检查空值检查
    let nullCheckPatterns = [
        /!=\s*null/g,
        /!==\s*null/g,
        /==\s*null/g,
        /===\s*null/g,
        /!=\s*undefined/g,
        /!==\s*undefined/g,
        /==\s*undefined/g,
        /===\s*undefined/g,
        /!!/g,
        /\?\?/g
    ];
    
    let nullCheckCount = 0;
    for (let i = 0; i < lines.length; i++) {
        for (const pattern of nullCheckPatterns) {
            const matches = lines[i].match(pattern);
            if (matches) {
                nullCheckCount += matches.length;
            }
        }
    }
    
    console.log(`  空值检查: ${nullCheckCount} 处`);
}

// 检查异步操作
function checkAsyncOperations(lines) {
    const asyncPatterns = [
        /async\s+function/g,
        /async\s*=>/g,
        /\.then\(/g,
        /\.catch\(/g,
        /await/g,
        /setTimeout/g,
        /setInterval/g,
        /fetch\(/g,
        /XMLHttpRequest/g
    ];
    
    let asyncCount = 0;
    let promiseChainCount = 0;
    let missingCatchCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        for (const pattern of asyncPatterns) {
            if (pattern.test(lines[i])) {
                asyncCount++;
                
                if (pattern.source === '\.then\(') {
                    promiseChainCount++;
                    
                    // 检查是否缺少catch
                    let hasCatch = false;
                    for (let j = i; j < Math.min(lines.length, i + 5); j++) {
                        if (lines[j].includes('.catch(')) {
                            hasCatch = true;
                            break;
                        }
                    }
                    if (!hasCatch) {
                        missingCatchCount++;
                    }
                }
                
                pattern.lastIndex = 0;
                break;
            }
        }
    }
    
    console.log(`  异步操作: ${asyncCount} 处`);
    console.log(`  Promise链: ${promiseChainCount} 处`);
    console.log(`  可能缺少catch的Promise链: ${missingCatchCount} 处`);
    
    if (missingCatchCount > 0) {
        console.log('  ⚠️  存在未捕获的Promise链，可能导致未处理的异步错误');
    }
}