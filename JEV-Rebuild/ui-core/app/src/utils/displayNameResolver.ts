// 系统级合法占位名 - 人类语义兜底
export const DEFAULT_ANONYMOUS_NAME = '未命名客户'

export function resolveDisplayNameStrict(customer: any): string {
  const name = 
    customer?.stable_name ?? 
    customer?.customer_name ?? 
    customer?.real_name ?? 
    customer?.display_name ?? 
    null

  if (name && name !== customer?.customer_id) {
    return name
  }

  return DEFAULT_ANONYMOUS_NAME
}
