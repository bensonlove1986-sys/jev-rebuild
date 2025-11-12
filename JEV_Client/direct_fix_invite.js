/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.191Z */
const fs = require('fs');
const path = require('path');

// 配置
const TARGET_FILE = 'd:\\PDF转网页\\JEV_Client\\modules\\inviteCodeManager.js';
const LOG_FILE = 'd:\\PDF转网页\\JEV_ControlCenter\\deploy\\encoding_fix_report.txt';

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n', { flag: 'a' });
  } catch (e) {
    console.error('无法写入日志文件:', e.message);
  }
}

// 修复inviteCodeManager.js
function fixInviteCodeManager() {
  log('=== 开始修复 inviteCodeManager.js ===');
  
  try {
    // 读取文件
    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    let fixedContent = content;
    
    // 使用字符串位置进行直接替换，避免在代码中直接包含乱码字符
    // 替换文件头部注释
    const headerCommentStart = '// JEV Client v7.0 - ';
    const headerCommentEnd = '\nclass InviteCodeManager {';
    const headerCommentIndex = fixedContent.indexOf(headerCommentStart);
    const headerCommentEndIndex = fixedContent.indexOf(headerCommentEnd);
    
    if (headerCommentIndex !== -1 && headerCommentEndIndex !== -1) {
      const fixedHeader = headerCommentStart + '邀请码生成与验证系统';
      fixedContent = fixedContent.substring(0, headerCommentIndex) + fixedHeader + fixedContent.substring(headerCommentEndIndex);
      log('修复了文件头部注释');
    }
    
    // 替换validityPeriod注释
    const validityCommentStart = 'this.validityPeriod = 7 * 24 * 60 * 60 * 1000; // ';
    const validityCommentEnd = '\n        this.baseUrl =';
    const validityCommentIndex = fixedContent.indexOf(validityCommentStart);
    const validityCommentEndIndex = fixedContent.indexOf(validityCommentEnd, validityCommentIndex);
    
    if (validityCommentIndex !== -1 && validityCommentEndIndex !== -1) {
      const fixedValidity = validityCommentStart + '7天有效期（毫秒）';
      fixedContent = fixedContent.substring(0, validityCommentIndex) + fixedValidity + fixedContent.substring(validityCommentEndIndex);
      log('修复了有效期注释');
    }
    
    // 替换console.log
    const consoleLog1 = 'console.log(';
    const consoleLog2 = ');';
    const consoleLogStartIndex = fixedContent.indexOf(consoleLog1);
    const consoleLogEndIndex = fixedContent.indexOf(consoleLog2, consoleLogStartIndex + consoleLog1.length);
    
    if (consoleLogStartIndex !== -1 && consoleLogEndIndex !== -1) {
      const fixedConsoleLog = 'console.log(\'🍎 InviteCodeManager 初始化完成\');';
      fixedContent = fixedContent.substring(0, consoleLogStartIndex) + fixedConsoleLog + fixedContent.substring(consoleLogEndIndex + 2);
      log('修复了初始化日志');
    }
    
    // 替换方法注释 - generateInviteCode
    const generateCommentStart = '/**\n     * ';
    const generateCommentEnd = '     */';
    const generateCommentStartIndex = fixedContent.indexOf('generateInviteCode', 50);
    const generateCommentSearchStart = fixedContent.lastIndexOf(generateCommentStart, generateCommentStartIndex);
    const generateCommentEndIndex = fixedContent.indexOf(generateCommentEnd, generateCommentSearchStart);
    
    if (generateCommentSearchStart !== -1 && generateCommentEndIndex !== -1) {
      const fixedGenerateComment = '/**\n     * 生成邀请码\n     * @param {string} prefix - 邀请码前缀\n     * @param {number} length - 随机码部分长度\n     * @returns {string} 格式化的邀请码\n     */';
      fixedContent = fixedContent.substring(0, generateCommentSearchStart) + fixedGenerateComment + fixedContent.substring(generateCommentEndIndex + 6);
      log('修复了生成邀请码方法注释');
    }
    
    // 替换格式化注释
    const formatCommentStart = '// ';
    const formatCommentEnd = '\n        const formattedCode =';
    const formatCommentStartIndex = fixedContent.indexOf('formattedCode', 100);
    const formatCommentSearchStart = fixedContent.lastIndexOf(formatCommentStart, formatCommentStartIndex);
    const formatCommentEndIndex = fixedContent.indexOf(formatCommentEnd, formatCommentSearchStart);
    
    if (formatCommentSearchStart !== -1 && formatCommentEndIndex !== -1) {
      const fixedFormatComment = '// 格式化邀请码: JEV-XXXXX-YYYY';
      fixedContent = fixedContent.substring(0, formatCommentSearchStart) + fixedFormatComment + fixedContent.substring(formatCommentEndIndex);
      log('修复了格式化注释');
    }
    
    // 替换生成日志
    const generateLogStart = 'console.log(`';
    const generateLogEnd = '`);';
    const generateLogStartIndex = fixedContent.indexOf(generateLogStart);
    const generateLogEndIndex = fixedContent.indexOf(generateLogEnd, generateLogStartIndex);
    
    if (generateLogStartIndex !== -1 && generateLogEndIndex !== -1) {
      const fixedGenerateLog = 'console.log(`✅ 生成邀请码: ${formattedCode}`);';
      fixedContent = fixedContent.substring(0, generateLogStartIndex) + fixedGenerateLog + fixedContent.substring(generateLogEndIndex + 3);
      log('修复了生成日志');
    }
    
    // 替换validateInviteCodeFormat方法注释
    const validateCommentStart = '/**\n     * ';
    const validateCommentEnd = '     */';
    const validateCommentStartIndex = fixedContent.indexOf('validateInviteCodeFormat', 150);
    const validateCommentSearchStart = fixedContent.lastIndexOf(validateCommentStart, validateCommentStartIndex);
    const validateCommentEndIndex = fixedContent.indexOf(validateCommentEnd, validateCommentSearchStart);
    
    if (validateCommentSearchStart !== -1 && validateCommentEndIndex !== -1) {
      const fixedValidateComment = '/**\n     * 验证邀请码格式\n     * @param {string} code - 待验证的邀请码\n     * @returns {boolean} 是否有效格式\n     */';
      fixedContent = fixedContent.substring(0, validateCommentSearchStart) + fixedValidateComment + fixedContent.substring(validateCommentEndIndex + 6);
      log('修复了验证格式方法注释');
    }
    
    // 替换格式检查注释
    const checkCommentStart = '// ';
    const checkCommentEnd = '\n        const codePattern =';
    const checkCommentStartIndex = fixedContent.indexOf('codePattern', 200);
    const checkCommentSearchStart = fixedContent.lastIndexOf(checkCommentStart, checkCommentStartIndex);
    const checkCommentEndIndex = fixedContent.indexOf(checkCommentEnd, checkCommentSearchStart);
    
    if (checkCommentSearchStart !== -1 && checkCommentEndIndex !== -1) {
      const fixedCheckComment = '// 检查邀请码格式: JEV-XXXXX-YYYY 或 JEV-CLIENT-LOGIN(特殊测试码)';
      fixedContent = fixedContent.substring(0, checkCommentSearchStart) + fixedCheckComment + fixedContent.substring(checkCommentEndIndex);
      log('修复了格式检查注释');
    }
    
    // 替换警告日志
    const warnLogStart = 'console.warn(`';
    const warnLogEnd = '`);';
    const warnLogStartIndex = fixedContent.indexOf(warnLogStart);
    const warnLogEndIndex = fixedContent.indexOf(warnLogEnd, warnLogStartIndex);
    
    if (warnLogStartIndex !== -1 && warnLogEndIndex !== -1) {
      const fixedWarnLog = 'console.warn(`⚠️ 邀请码格式无效: ${code}`);';
      fixedContent = fixedContent.substring(0, warnLogStartIndex) + fixedWarnLog + fixedContent.substring(warnLogEndIndex + 3);
      log('修复了警告日志');
    }
    
    // 保存修复后的文件
    fs.writeFileSync(TARGET_FILE, fixedContent, 'utf8');
    log('成功保存修复后的文件');
    
    return true;
  } catch (error) {
    log(`修复错误: ${error.message}`);
    return false;
  }
}

// 验证修复结果
function verifyFix() {
  log('\n=== 验证修复结果 ===');
  
  try {
    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    
    // 检查是否包含关键的中文文本
    const hasChinese = content.includes('邀请码') && 
                      content.includes('生成') && 
                      content.includes('验证');
    
    if (hasChinese) {
      log('验证成功: inviteCodeManager.js 包含正确的中文文本');
      return true;
    } else {
      log('验证失败: inviteCodeManager.js 未找到预期的中文文本');
      return false;
    }
  } catch (error) {
    log(`验证错误: ${error.message}`);
    return false;
  }
}

// 主函数
function main() {
  console.log('开始修复 inviteCodeManager.js 文件...');
  
  const fixed = fixInviteCodeManager();
  const verified = verifyFix();
  
  console.log('\n修复完成！');
  console.log(`修复状态: ${fixed ? '成功' : '失败'}`);
  console.log(`验证状态: ${verified ? '通过' : '失败'}`);
}

// 执行脚本
main();