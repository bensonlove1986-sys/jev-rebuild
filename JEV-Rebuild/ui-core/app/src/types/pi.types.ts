// PI Types
// 定义PI相关的数据结构

// PI数据结构
export interface PI {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  piDate: string;
  dueDate?: string;
  products: PIProduct[];
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  termsAndConditions?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// PI产品数据结构
export interface PIProduct {
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// PI模板数据结构
export interface PITemplate {
  id: string;
  name: string;
  description?: string;
  products: PIProduct[];
  termsAndConditions?: string;
  taxRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// AI辅助功能类型
export interface AIAssistOptions {
  generateDescription?: boolean;
  calculatePrices?: boolean;
  generateTerms?: boolean;
  autoFillCustomerInfo?: boolean;
}

// PI创建请求
export interface PICreateRequest {
  customerId: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  piDate: string;
  dueDate?: string;
  taxRate: number;
  termsAndConditions?: string;
  notes?: string;
}

// PI更新请求
export interface PIUpdateRequest {
  id: string;
  customerId?: string;
  customerName?: string;
  piDate?: string;
  dueDate?: string;
  products?: PIProduct[];
  taxRate?: number;
  termsAndConditions?: string;
  notes?: string;
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
}
