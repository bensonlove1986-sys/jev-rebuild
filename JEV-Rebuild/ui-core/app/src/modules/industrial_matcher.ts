// 工业类别识别模块
export function matchIndustrialCategory(ocrText: string) {
  // 将 OCR_TEXT 转为大写
  const text = ocrText.toUpperCase();
  
  // 工业类别规则表
  const INDUSTRIAL_RULES = [
    { keywords: ["PROXIMITY", "SENSOR", "SWITCH"], category: "Industrial Sensor" },
    { keywords: ["PHOTOELECTRIC"], category: "Photoelectric Sensor" },
    { keywords: ["CAPACITIVE"], category: "Capacitive Sensor" },
    { keywords: ["INDUCTIVE"], category: "Inductive Sensor" },
    { keywords: ["SOLENOID", "VALVE"], category: "Solenoid Valve" },
    { keywords: ["PNEUMATIC", "CYLINDER"], category: "Pneumatic Cylinder" },
    { keywords: ["FESTO", "SMC", "AIRTAC"], category: "Pneumatic Component" }
  ];
  
  // 遍历规则进行匹配
  for (const rule of INDUSTRIAL_RULES) {
    const matched = rule.keywords.some(keyword => text.includes(keyword));
    if (matched) {
      return {
        category: rule.category,
        confidence: 0.9
      };
    }
  }
  
  // 未匹配到任何类别
  return {
    category: "General Industrial Product",
    confidence: 0.5
  };
}
