/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.153Z */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 诊断报告文件路径
const reportPath = path.join(__dirname, 'jev_ui_diagnosis_report.txt');
let reportContent = `[${new Date().toLocaleString('zh-CN')}] JEV Client UI 诊断报告\n`;
reportContent += '='.repeat(80) + '\n\n';

// 1. 检查main.js文件状态
function checkMainJsStatus() {
    reportContent += '[1] main.js 文件状态检查\n';
    reportContent += '-'.repeat(40) + '\n';
    
    const mainJsPath = path.join(__dirname, 'main.js');
    
    try {
        // 检查文件是否存在
        if (fs.existsSync(mainJsPath)) {
            // 获取文件信息
            const stats = fs.statSync(mainJsPath);
            reportContent += `✅ 文件存在: ${mainJsPath}\n`;
            reportContent += `  - 文件大小: ${stats.size} 字节\n`;
            reportContent += `  - 创建时间: ${stats.birthtime.toLocaleString('zh-CN')}\n`;
            reportContent += `  - 修改时间: ${stats.mtime.toLocaleString('zh-CN')}\n`;
            
            // 检查文件内容是否为空
            const content = fs.readFileSync(mainJsPath, 'utf8');
            if (content.length > 0) {
                reportContent += '✅ 文件内容不为空\n';
                
                // 检查是否包含我们添加的恢复脚本
                if (content.includes('Page restored successfully')) {
                    reportContent += '✅ 包含页面恢复安全补丁\n';
                } else {
                    reportContent += '⚠️  未检测到页面恢复补丁\n';
                }
                
                // 简单语法检查
                try {
                    // 检查括号匹配
                    const openBrackets = (content.match(/\{/g) || []).length;
                    const closeBrackets = (content.match(/\}/g) || []).length;
                    const openParentheses = (content.match(/\(/g) || []).length;
                    const closeParentheses = (content.match(/\)/g) || []).length;
                    
                    reportContent += `  - 括号匹配检查:\n`;
                    reportContent += `    * { }: ${openBrackets} vs ${closeBrackets} - ${openBrackets === closeBrackets ? '✅ 匹配' : '❌ 不匹配'}\n`;
                    reportContent += `    * ( ): ${openParentheses} vs ${closeParentheses} - ${openParentheses === closeParentheses ? '✅ 匹配' : '❌ 不匹配'}\n`;
                    
                } catch (e) {
                    reportContent += `⚠️  语法检查过程出错: ${e.message}\n`;
                }
                
            } else {
                reportContent += '❌ 文件内容为空\n';
            }
        } else {
            reportContent += '❌ 文件不存在\n';
        }
    } catch (error) {
        reportContent += `❌ 检查失败: ${error.message}\n`;
    }
    
    reportContent += '\n';
}

// 2. 检查index.html结构
function checkIndexHtml() {
    reportContent += '[2] index.html 结构与引用检查\n';
    reportContent += '-'.repeat(40) + '\n';
    
    const indexHtmlPath = path.join(__dirname, 'index.html');
    
    try {
        if (fs.existsSync(indexHtmlPath)) {
            const content = fs.readFileSync(indexHtmlPath, 'utf8');
            
            // 检查main.js引用
            if (content.includes('<script src="main.js"></script>')) {
                reportContent += '✅ 正确引用了 main.js\n';
            } else {
                reportContent += '❌ 未找到 main.js 的正确引用\n';
            }
            
            // 检查关键容器元素
            reportContent += '\n关键容器元素检查:\n';
            reportContent += `  - loading-container: ${content.includes('id="loading-container"') ? '✅ 存在' : '❌ 缺失'}\n`;
            reportContent += `  - app-container: ${content.includes('id="app-container"') ? '✅ 存在' : '❌ 缺失'}\n`;
            
            // 检查app-container的默认状态
            if (content.includes('id="app-container" class="hidden"')) {
                reportContent += '⚠️  app-container 默认被 hidden 类隐藏\n';
            } else {
                reportContent += '✅ 未检测到 app-container 默认隐藏\n';
            }
            
            // 检查loading-container的默认显示状态
            if (content.includes('id="loading-container"')) {
                reportContent += '⚠️  loading-container 默认显示\n';
            }
            
            // 检查DOMContentLoaded事件监听器
            const domContentLoadedCount = (content.match(/DOMContentLoaded/g) || []).length;
            reportContent += `\nDOMContentLoaded 事件监听器数量: ${domContentLoadedCount}\n`;
            
            // 检查showMainInterface函数
            if (content.includes('function showMainInterface')) {
                reportContent += '✅ 存在 showMainInterface 函数\n';
                if (content.includes('document.getElementById(\'loading-container\').style.display = \'none\'')) {
                    reportContent += '  - ✅ 包含隐藏loading-container的代码\n';
                }
                if (content.includes('document.getElementById(\'app-container\').classList.remove(\'hidden\'')) {
                    reportContent += '  - ✅ 包含显示app-container的代码\n';
                }
            } else {
                reportContent += '❌ 未找到 showMainInterface 函数\n';
            }
            
        } else {
            reportContent += '❌ index.html 文件不存在\n';
        }
    } catch (error) {
        reportContent += `❌ 检查失败: ${error.message}\n`;
    }
    
    reportContent += '\n';
}

// 3. CSS与颜色分析
function analyzeCssAndColors() {
    reportContent += '[3] CSS 与颜色分析\n';
    reportContent += '-'.repeat(40) + '\n';
    
    const indexHtmlPath = path.join(__dirname, 'index.html');
    
    try {
        if (fs.existsSync(indexHtmlPath)) {
            const content = fs.readFileSync(indexHtmlPath, 'utf8');
            
            // 检查背景颜色
            if (content.includes('bg-gray-900')) {
                reportContent += '⚠️  使用了深色背景 bg-gray-900\n';
            }
            
            // 检查文本颜色
            if (content.includes('text-white')) {
                reportContent += '✅ 主文本使用了白色 text-white\n';
            } else {
                reportContent += '⚠️  未找到 text-white 类\n';
            }
            
            // 检查Tailwind CSS引入
            if (content.includes('tailwindcss')) {
                reportContent += '✅ 已引入 Tailwind CSS\n';
            } else {
                reportContent += '❌ 未检测到 Tailwind CSS 引入\n';
            }
            
            // 检查颜色对比度建议
            reportContent += '\n颜色对比度分析:\n';
            if (content.includes('bg-gray-900') && content.includes('text-white')) {
                reportContent += '✅ bg-gray-900 与 text-white 的对比度良好\n';
            } else {
                reportContent += '⚠️  可能存在背景与文本颜色对比度不足的风险\n';
            }
            
            // 检查hidden类的使用
            const hiddenClassCount = (content.match(/class="[^"]*hidden[^"]*"/g) || []).length;
            reportContent += `\n页面中使用 hidden 类的元素数量: ${hiddenClassCount}\n`;
            
            // 检查display:none的使用
            const displayNoneCount = (content.match(/display:[^;]*none/g) || []).length;
            reportContent += `页面中使用 display:none 的样式数量: ${displayNoneCount}\n`;
            
        } else {
            reportContent += '❌ index.html 文件不存在\n';
        }
    } catch (error) {
        reportContent += `❌ 分析失败: ${error.message}\n`;
    }
    
    reportContent += '\n';
}

// 4. 服务器状态检查
function checkServerStatus() {
    reportContent += '[4] 服务器状态检查\n';
    reportContent += '-'.repeat(40) + '\n';
    
    try {
        // 检查是否有Node.js服务器进程在运行
        const nodeProcesses = execSync('tasklist /FI "IMAGENAME eq node.exe" /V', { encoding: 'utf8' });
        
        if (nodeProcesses.includes('server.js')) {
            reportContent += '✅ 检测到 server.js 进程正在运行\n';
            
            // 查找端口8080的使用情况
            try {
                const portInfo = execSync('netstat -ano | findstr :8080', { encoding: 'utf8' });
                if (portInfo) {
                    reportContent += '✅ 端口 8080 正在被使用\n';
                } else {
                    reportContent += '❌ 端口 8080 未被使用\n';
                }
            } catch (e) {
                reportContent += '⚠️  无法检查端口使用情况\n';
            }
            
        } else {
            reportContent += '❌ 未检测到 server.js 进程\n';
        }
        
    } catch (error) {
        reportContent += `⚠️  服务器检查过程出错: ${error.message}\n`;
    }
    
    reportContent += '\n';
}

// 5. 生成诊断摘要
function generateSummary() {
    reportContent += '[5] 诊断摘要与建议\n';
    reportContent += '-'.repeat(40) + '\n';
    
    const summary = [];
    
    // 根据前面的报告内容生成摘要
    if (reportContent.includes('✅ 文件存在') && reportContent.includes('✅ 文件内容不为空')) {
        summary.push('✅ main.js 文件状态正常');
    } else {
        summary.push('❌ main.js 文件可能缺失或损坏');
    }
    
    if (reportContent.includes('✅ 正确引用了 main.js')) {
        summary.push('✅ index.html 正确引用了 main.js');
    } else {
        summary.push('❌ main.js 引用路径可能错误');
    }
    
    if (reportContent.includes('⚠️  app-container 默认被 hidden 类隐藏')) {
        summary.push('⚠️  app-container 默认隐藏，需要JavaScript触发显示');
    }
    
    if (reportContent.includes('✅ 存在 showMainInterface 函数')) {
        summary.push('✅ 存在界面显示控制函数');
    } else {
        summary.push('❌ 缺少界面显示控制函数');
    }
    
    if (reportContent.includes('✅ 检测到 server.js 进程正在运行')) {
        summary.push('✅ 服务器正在运行');
    } else {
        summary.push('❌ 服务器可能未启动');
    }
    
    // 添加建议
    summary.push('\n建议措施:');
    summary.push('1. 清除浏览器缓存后重试');
    summary.push('2. 检查浏览器控制台是否有JavaScript错误');
    summary.push('3. 确认页面加载时是否执行了DOMContentLoaded事件');
    summary.push('4. 验证main.js是否成功执行了showMainInterface函数');
    
    // 添加到报告
    summary.forEach(line => {
        reportContent += line + '\n';
    });
}

// 主函数
function main() {
    reportContent += 'JEV Client 页面白屏原因诊断\n';
    reportContent += '诊断项目：脚本加载状态、DOM元素显示、CSS分析\n\n';
    
    // 执行各项检查
    checkMainJsStatus();
    checkIndexHtml();
    analyzeCssAndColors();
    checkServerStatus();
    generateSummary();
    
    // 添加完成时间
    reportContent += '\n' + '='.repeat(80) + '\n';
    reportContent += `诊断完成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    reportContent += '诊断结论：页面白屏可能是由于JavaScript执行异常、DOM元素未正确显示或样式冲突导致。';
    
    // 保存报告
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log('诊断完成！报告已保存到:', reportPath);
    console.log('\n' + reportContent);
}

// 运行主函数
main();