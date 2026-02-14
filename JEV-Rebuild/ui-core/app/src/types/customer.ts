// src/types/customer.ts
export interface Customer {
  customer_id: string;
  display_name: string;
  phone?: string;
  email?: string;
  company?: string;
  status?: 'active' | 'inactive';
  source?: 'daojie' | string;
  created_at?: number;
  last_message_at?: number;
}