// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  status?: 'active' | 'inactive';
  created_at?: number;
  updated_at?: number;
  tags?: string[];
}