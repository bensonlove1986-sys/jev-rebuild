import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

// 产品类型定义
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
}

interface ProductsState {
  // 产品数据，格式：{ customer_id: Product[] }
  products: Product[];
  isLoading: boolean;
  error: string | null;
  selectedProductId: string | null;
  
  // 产品相关操作
  fetchProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  addProduct: (product: Omit<Product, 'id'>) => void;
  batchAddProducts: (products: Omit<Product, 'id'>[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  selectProduct: (id: string) => void;
  getProductsByCategory: (category: string) => Product[];
  getActiveProducts: () => Product[];
  // 获取产品销售数据
  getProductSalesData: (productId: string) => { totalSales: number; totalRevenue: number };
}

// 生成唯一ID
const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// 模拟产品数据
const initialProducts: Product[] = [
  {
    id: '1',
    name: '产品A',
    category: '电子产品',
    price: 199.99,
    stock: 100,
    status: 'active'
  },
  {
    id: '2',
    name: '产品B',
    category: '家居用品',
    price: 49.99,
    stock: 50,
    status: 'active'
  },
  {
    id: '3',
    name: '产品C',
    category: '服装',
    price: 89.99,
    stock: 200,
    status: 'inactive'
  }
];

export const useProductsStore = create<ProductsState>((set, get) => {
  // 监听订单创建事件，更新产品库存
  eventBus.on('order:productSold', ({ productId, quantity }) => {
    const product = get().getProductById(productId);
    if (product) {
      // 更新产品库存
      get().updateProduct(productId, {
        stock: Math.max(0, product.stock - quantity)
      });
    }
  });

  return {
    products: initialProducts,
    isLoading: false,
    error: null,
    selectedProductId: null,
    
    // 获取产品列表
    fetchProducts: async () => {
      set({ isLoading: true, error: null });
      
      try {
        // 这里应该调用真实的API获取产品数据
        // 目前使用模拟数据
        // const response = await fetch('/api/products');
        // const data = await response.json();
        
        // 使用模拟数据
        const data = initialProducts;
        
        set({ products: data, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to fetch products',
          isLoading: false 
        });
      }
    },
  
  // 根据ID获取产品
  getProductById: (id) => {
    return get().products.find(product => product.id === id);
  },
  
  // 添加产品
  addProduct: (product) => {
    const newProduct: Product = {
      ...product,
      id: generateId()
    };
    
    set(state => ({
      products: [...state.products, newProduct]
    }));
    
    // 触发产品添加事件
    eventBus.emit('product:added', newProduct);
  },
  
  // 批量添加产品
  batchAddProducts: (products) => {
    const newProducts: Product[] = products.map(product => ({
      ...product,
      id: generateId()
    }));
    
    set(state => ({
      products: [...state.products, ...newProducts]
    }));
    
    // 触发批量产品添加事件
    eventBus.emit('product:batchAdded', newProducts);
  },
  
  // 更新产品
  updateProduct: (id, updates) => {
    set(state => {
      const updatedProducts = state.products.map(product => 
        product.id === id ? { ...product, ...updates } : product
      );
      
      // 获取更新后的产品
      const updatedProduct = updatedProducts.find(p => p.id === id);
      
      // 触发产品更新事件
      if (updatedProduct) {
        eventBus.emit('product:updated', updatedProduct);
      }
      
      return {
        products: updatedProducts
      };
    });
  },
  
  // 删除产品
  deleteProduct: (id) => {
    set(state => {
      // 触发产品删除事件
      const productToDelete = state.products.find(p => p.id === id);
      if (productToDelete) {
        eventBus.emit('product:deleted', productToDelete);
      }
      
      return {
        products: state.products.filter(product => product.id !== id)
      };
    });
  },
  
  // 选择产品
  selectProduct: (id) => {
    set({ selectedProductId: id });
    
    // 触发产品选择事件
    const product = get().getProductById(id);
    if (product) {
      eventBus.emit('product:selected', product);
    }
  },
  
  // 根据分类获取产品
  getProductsByCategory: (category) => {
    return get().products.filter(product => product.category === category);
  },
  
  // 获取活跃产品
  getActiveProducts: () => {
    return get().products.filter(product => product.status === 'active');
  },
  
  // 获取产品销售数据（模拟）
    getProductSalesData: (productId) => {
      // 这里应该从订单系统获取真实的销售数据
      // 目前使用模拟数据
      const mockSalesData = [
        { productId: '1', totalSales: 250, totalRevenue: 49997.50 },
        { productId: '2', totalSales: 100, totalRevenue: 4999.00 },
        { productId: '3', totalSales: 50, totalRevenue: 4499.50 }
      ];
      
      return mockSalesData.find(item => item.productId === productId) || { totalSales: 0, totalRevenue: 0 };
    }
  };
});
