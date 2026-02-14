import { fetchApi } from './apiClient';

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed';
  created_at: number;
  updated_at: number;
}

// 获取客户订单列表
export async function getOrdersByCustomerId(customerId: string): Promise<Order[]> {
  return fetchApi<Order[]>(`/api/orders?customer_id=${encodeURIComponent(customerId)}`);
}

// 生成PI响应类型
export interface GeneratePIResponse {
  ok: boolean;
  pi_id?: string;
  download_url?: string;
}

// 生成PI
export async function generatePI(customerId: string): Promise<GeneratePIResponse> {
  return fetchApi<GeneratePIResponse>('/api/pi/generate', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
    }),
  });
}
