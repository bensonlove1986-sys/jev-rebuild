const fs = require('fs');
const path = require('path');

// 文件路径
const sourceFile = path.join('d:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js');
const backupFile = path.join('d:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js.bak');

// 尝试使用不同的编码组合进行转换
function tryEncodingConversion() {
    console.log('开始尝试修复文件编码...');
    
    // 确保有备份文件
    if (!fs.existsSync(backupFile)) {
        console.log('创建备份文件...');
        fs.copyFileSync(sourceFile, backupFile);
    }
    
    // 尝试不同的编码组合
    const encodingPairs = [
        { from: 'binary', to: 'utf8' },
        { from: 'latin1', to: 'utf8' },
        { from: 'utf16le', to: 'utf8' },
        { from: 'ascii', to: 'utf8' }
    ];
    
    encodingPairs.forEach((pair, index) => {
        try {
            console.log(`尝试编码转换 ${index + 1}: ${pair.from} -> ${pair.to}`);
            
            // 读取文件
            const content = fs.readFileSync(backupFile, pair.from);
            
            // 写入文件
            fs.writeFileSync(sourceFile, content, pair.to);
            
            console.log(`成功使用 ${pair.from} -> ${pair.to} 转换编码`);
            
            // 尝试读取并显示前几行
            const testContent = fs.readFileSync(sourceFile, 'utf8');
            const lines = testContent.split('\n').slice(3520, 3530);
            console.log('文件转换后的内容预览:');
            lines.forEach((line, i) => console.log(`第 ${3520 + i} 行: ${line}`));
            
        } catch (error) {
            console.error(`转换失败 (${pair.from} -> ${pair.to}): ${error.message}`);
        }
    });
    
    // 最终尝试：使用二进制方式读取，然后尝试检测编码
    try {
        console.log('尝试使用二进制方式读取并重新保存...');
        const buffer = fs.readFileSync(backupFile);
        fs.writeFileSync(sourceFile, buffer.toString('utf8'), 'utf8');
        console.log('二进制读取转换完成');
    } catch (error) {
        console.error('二进制读取转换失败:', error.message);
    }
    
    console.log('编码修复尝试完成！');
}

// 运行修复
tryEncodingConversion();
