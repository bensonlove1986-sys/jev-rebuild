// Integration Service
// 用于与内部系统进行集成，获取CRM、产品中心和订单系统的数据

// TODO[SOURCE_GATE]:
// Services must dispatch via system_scheduler.
// Direct store mutation will be removed in Source Normalization phase.
import { useCustomersStore } from '../store/customersStore';
import { dispatch } from '../core/scheduler/system_scheduler';

// 产品数据类型
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock: number;
  status: 'active' | 'inactive';
}

// 订单数据类型
export interface Order {
  id: string;
  customerId: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

// 模拟产品数据
const mockProducts: Product[] = [
  {
    id: '1',
    name: '产品A',
    category: '电子产品',
    price: 199.99,
    description: '高性能电子产品',
    stock: 100,
    status: 'active',
  },
  {
    id: '2',
    name: '产品B',
    category: '家居用品',
    price: 49.99,
    description: '优质家居用品',
    stock: 50,
    status: 'active',
  },
  {
    id: '3',
    name: '产品C',
    category: '服装',
    price: 89.99,
    description: '时尚服装',
    stock: 200,
    status: 'active',
  },
];

// 模拟订单数据
const mockOrders: Order[] = [
  {
    id: 'order-001',
    customerId: 'c1',
    orderDate: '2025-12-20',
    status: 'completed',
    totalAmount: 399.98,
    products: [
      { productId: '1', quantity: 2, price: 199.99 },
    ],
  },
  {
    id: 'order-002',
    customerId: 'c2',
    orderDate: '2025-12-15',
    status: 'pending',
    totalAmount: 149.98,
    products: [
      { productId: '1', quantity: 1, price: 199.99 },
      { productId: '2', quantity: 1, price: 49.99 },
    ],
  },
];

// PI数据接口
export interface PIData {
  customer: {
    id: string;
    name: string;
    status: string;
  };
  order: {
    id: string;
    date: string;
    status: string;
  };
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
}

class IntegrationService {
  // 从CRM获取客户信息
  async getCustomerInfo(customerId: string) {
    // TODO[SOURCE_GATE]:
    // Establish unified event flow
    dispatch({
      type: "SERVICE_EVENT",
      source: "IntegrationService",
      payload: {
        event: "getCustomerInfo",
        customerId
      }
    });
    
    // 这里应该调用真实的CRM API，现在使用模拟数据
    const customersStore = useCustomersStore.getState();
    const customer = customersStore.customers.find(c => c.customer_id === customerId);
    
    if (customer) {
      return {
        success: true,
        data: customer,
      };
    }
    
    return {
      success: false,
      error: 'Customer not found',
    };
  }

  // 获取所有产品数据
  async getAllProducts(): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    // 这里应该调用真实的产品中心API，现在使用模拟数据
    return {
      success: true,
      data: mockProducts,
    };
  }

  // 根据ID获取产品
  async getProductById(productId: string): Promise<{ success: boolean; data?: Product; error?: string }> {
    // 这里应该调用真实的产品中心API，现在使用模拟数据
    const product = mockProducts.find(p => p.id === productId);
    
    if (product) {
      return {
        success: true,
        data: product,
      };
    }
    
    return {
      success: false,
      error: 'Product not found',
    };
  }

  // 获取订单数据
  async getOrderById(orderId: string): Promise<{ success: boolean; data?: Order; error?: string }> {
    // 这里应该调用真实的订单系统API，现在使用模拟数据
    const order = mockOrders.find(o => o.id === orderId);
    
    if (order) {
      return {
        success: true,
        data: order,
      };
    }
    
    return {
      success: false,
      error: 'Order not found',
    };
  }

  // 获取客户的订单历史
  async getCustomerOrders(customerId: string): Promise<{ success: boolean; data?: Order[]; error?: string }> {
    // 这里应该调用真实的订单系统API，现在使用模拟数据
    const orders = mockOrders.filter(o => o.customerId === customerId);
    
    return {
      success: true,
      data: orders,
    };
  }

  // 从订单创建PI数据
  async createPIFromOrder(orderId: string): Promise<{ success: boolean; data?: PIData; error?: string }> {
    try {
      const orderResult = await this.getOrderById(orderId);
      
      if (!orderResult.success || !orderResult.data) {
        return { success: false, error: orderResult.error || 'Failed to get order' };
      }

      const order = orderResult.data;
      const customerResult = await this.getCustomerInfo(order.customerId);
      
      if (!customerResult.success || !customerResult.data) {
        return { success: false, error: customerResult.error || 'Failed to get customer info' };
      }

      const customer = customerResult.data;
      
      // 构建PI数据结构
      const piData: PIData = {
        customer: {
          id: customer.customer_id,
          name: customer.display_name,
          status: customer.status,
        },
        order: {
          id: order.id,
          date: order.orderDate,
          status: order.status,
        },
        products: await Promise.all(order.products.map(async (orderProduct) => {
          const productResult = await this.getProductById(orderProduct.productId);
          if (productResult.success && productResult.data) {
            return {
              productId: productResult.data.id,
              name: productResult.data.name,
              quantity: orderProduct.quantity,
              unitPrice: productResult.data.price,
              totalPrice: orderProduct.quantity * productResult.data.price,
            };
          }
          return null;
        }).filter(Boolean) as Array<{
          productId: string;
          name: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }>),
        totalAmount: order.totalAmount,
      };

      return { success: true, data: piData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PI from order',
      };
    }
  }
}

export const integrationService = new IntegrationService();
