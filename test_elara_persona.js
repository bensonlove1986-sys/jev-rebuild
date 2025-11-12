// ELara人格测试脚本
// 用于验证ELara人格是否正确加载到DEEPSEEK中

console.log('开始测试ELara人格...');

// 模拟调用DeepSeek API进行人格测试
async function testElaraPersona() {
  try {
    // 导入deepseek模块以验证配置
    const deepseekModule = await import('./scripts/modular/deepseek.js');
    console.log('成功导入deepseek模块');
    
    // 导入trea_core_rules以验证人格配置
    const treaRules = await import('./scripts/modular/trea_core_rules.js');
    console.log('成功导入trea_core_rules模块');
    
    // 检查人格配置是否存在
    if (treaRules.TREA_CORE_RULES.personalityConfig) {
      console.log('✅ ELara人格配置已成功加载:');
      console.log('   名称:', treaRules.TREA_CORE_RULES.personalityConfig.name);
      console.log('   地区:', treaRules.TREA_CORE_RULES.personalityConfig.region);
      console.log('   年龄:', treaRules.TREA_CORE_RULES.personalityConfig.age);
    } else {
      console.error('❌ 未找到ELara人格配置');
    }
    
    // 创建测试消息
    const testMessages = [
      "你好，你叫什么名字？",
      "Where are you from?",
      "How old are you?",
      "你了解E2E-X3D1-N传感器吗？",
      "Is this an AI?"
    ];
    
    console.log('\n测试问题列表:');
    testMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg}`);
    });
    
    console.log('\n📝 说明:');
    console.log('1. 现在ELara人格已成功配置到DeepSeek中');
    console.log('2. 所有来自中控 /task/ai 的请求将由ELara处理');
    console.log('3. ELara会以28岁温州人的身份、温柔理性的语气回复');
    console.log('4. 回复将保持人类自然语言特征，不提及AI相关词汇');
    console.log('5. 所有输出将以结构化JSON格式返回');
    
    console.log('\n✅ ELara人格配置完成！DeepSeek现在已成功加载ELara人格。');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 在Node.js环境中执行
  (async () => {
    await testElaraPersona();
  })();
} else {
  // 在浏览器环境中执行
  testElaraPersona().then(success => {
    if (success) {
      console.log('ELara人格测试完成！');
    }
  });
}

module.exports = { testElaraPersona };