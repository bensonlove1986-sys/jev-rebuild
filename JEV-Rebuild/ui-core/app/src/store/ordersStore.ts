import { create } from 'zustand';
import { integrationService } from '../services/integration.service';

// 订单状态类型
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

// 扩展Order接口，添加更多字段
export interface ExtendedOrder {
  id: string;
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  customerName?: string;
  products: Array<{
    productId: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: number;
  updatedAt: number;
  totalAmount: number;
}

interface OrdersState {
  orders: Record<string, ExtendedOrder[]>; // 按客户ID存储订单
  currentOrder: ExtendedOrder | null;
  isLoading: boolean;
  error: string | null;
  selectedOrderId: string | null;
  
  // 订单CRUD操作
  fetchOrders: () => Promise<void>;
  fetchOrdersByCustomer: (customerId: string) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<void>;
  createOrder: (orderData: Omit<ExtendedOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<ExtendedOrder>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  
  // 状态管理
  selectOrder: (orderId: string | null) => void;
  clearCurrentOrder: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: {},
  currentOrder: null,
  isLoading: false,
  error: null,
  selectedOrderId: null,
  
  // 获取所有订单
  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // 这里应该调用真实的订单API，现在使用模拟数据
      const mockOrders: ExtendedOrder[] = [
        {
          id: 'order-001',
          customerId: 'c1',
          customerName: '客户1',
          orderDate: '2025-12-20',
          status: 'completed',
          totalAmount: 399.98,
          products: [
            {
              productId: '1',
              name: '产品A',
              category: '电子产品',
              quantity: 2,
              unitPrice: 199.99,
              totalPrice: 399.98
            }
          ],
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 72000000
        },
        {
          id: 'order-002',
          customerId: 'c2',
          customerName: '客户2',
          orderDate: '2025-12-19',
          status: 'shipped',
          totalAmount: 149.98,
          products: [
            {
              productId: '1',
              name: '产品A',
              category: '电子产品',
              quantity: 1,
              unitPrice: 99.99,
              totalPrice: 99.99
            },
            {
              productId: '2',
              name: '产品B',
              category: '家居用品',
              quantity: 1,
              unitPrice: 49.99,
              totalPrice: 49.99
            }
          ],
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 86400000
        },
        {
          id: 'order-003',
          customerId: 'c1',
          customerName: '客户1',
          orderDate: '2025-12-18',
          status: 'pending',
          totalAmount: 299.97,
          products: [
            {
              productId: '3',
              name: '产品C',
              category: '服装',
              quantity: 3,
              unitPrice: 99.99,
              totalPrice: 299.97
            }
          ],
          createdAt: Date.now() - 259200000,
          updatedAt: Date.now() - 259200000
        }
      ];
      
      // 按客户ID分组
      const ordersByCustomer: Record<string, ExtendedOrder[]> = {};
      mockOrders.forEach(order => {
        if (!ordersByCustomer[order.customerId]) {
          ordersByCustomer[order.customerId] = [];
        }
        ordersByCustomer[order.customerId].push(order);
      });
      
      set({ orders: ordersByCustomer, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 根据客户ID获取订单
  fetchOrdersByCustomer: async (customerId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 调用integrationService获取客户订单
      const result = await integrationService.getCustomerOrders(customerId);
      
      if (result.success && result.data) {
        // 转换为ExtendedOrder格式
        const extendedOrders: ExtendedOrder[] = result.data.map((order) => ({
          ...order,
          status: (order.status as OrderStatus) || 'pending',
          createdAt: Date.now() - Math.floor(Math.random() * 30 * 86400000),
          updatedAt: Date.now() - Math.floor(Math.random() * 7 * 86400000),
          customerName: '客户 ' + customerId, // 临时添加客户名称
          products: order.products.map(product => ({
            productId: product.productId,
            name: `产品 ${product.productId}`, // 临时产品名称
            category: '未分类', // 临时分类
            quantity: product.quantity,
            unitPrice: product.price, // 使用API返回的price作为unitPrice
            totalPrice: product.price * product.quantity // 计算总价
          }))
        }));
        
        set((state) => ({
          orders: {
            ...state.orders,
            [customerId]: extendedOrders
          },
          isLoading: false
        }));
      } else {
        // 如果没有数据，设置为空数组
        set((state) => ({
          orders: {
            ...state.orders,
            [customerId]: []
          },
          isLoading: false
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer orders';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 根据订单ID获取订单详情
  fetchOrderById: async (orderId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 调用integrationService获取订单详情
      const result = await integrationService.getOrderById(orderId);
      
      if (result.success && result.data) {
        // 转换为ExtendedOrder格式，只使用API返回的真实数据
        const extendedOrder: ExtendedOrder = {
          ...result.data,
          status: (result.data.status as OrderStatus),
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          customerName: result.data.customerName,
          products: result.data.products.map(product => ({
            productId: product.productId,
            name: product.name,
            category: product.category,
            quantity: product.quantity,
            unitPrice: product.price, // 使用API返回的price作为unitPrice
            totalPrice: product.price * product.quantity // 计算总价
          }))
        };
        
        set({ currentOrder: extendedOrder, selectedOrderId: orderId, isLoading: false });
      } else {
        set({ error: 'Order not found', isLoading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 创建订单
  createOrder: async (orderData: Omit<ExtendedOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    
    try {
      const now = Date.now();
      const newOrder: ExtendedOrder = {
        ...orderData,
        id: `order-${now}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now
      };
      
      set((state) => {
        const customerId = newOrder.customerId;
        return {
          orders: {
            ...state.orders,
            [customerId]: [...(state.orders[customerId] || []), newOrder]
          },
          currentOrder: newOrder,
          selectedOrderId: newOrder.id,
          isLoading: false
        };
      });
      

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 更新订单
  updateOrder: async (orderId: string, updates: Partial<ExtendedOrder>) => {
    set({ isLoading: true, error: null });
    
    try {
      set((state) => {
        // 查找要更新的订单及其客户ID
        let updatedOrder: ExtendedOrder | null = null;
        const updatedOrders = { ...state.orders };
        
        // 遍历所有客户的订单
        for (const customerId in updatedOrders) {
          const customerOrders = updatedOrders[customerId];
          const orderIndex = customerOrders.findIndex(order => order.id === orderId);
          
          if (orderIndex !== -1) {
            // 更新订单
            updatedOrder = {
              ...customerOrders[orderIndex],
              ...updates,
              updatedAt: Date.now()
            };
            customerOrders[orderIndex] = updatedOrder;
            break;
          }
        }
        
        return {
          orders: updatedOrders,
          currentOrder: updatedOrder || null,
          isLoading: false
        };
      });
      

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 更新订单状态
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    await get().updateOrder(orderId, { status });
  },
  
  // 删除订单
  deleteOrder: async (orderId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      set((state) => {
        const updatedOrders = { ...state.orders };
        
        // 查找并删除订单
        for (const cid in updatedOrders) {
          const customerOrders = updatedOrders[cid];
          const orderIndex = customerOrders.findIndex(order => order.id === orderId);
          
          if (orderIndex !== -1) {
            // 删除订单
            updatedOrders[cid] = customerOrders.filter(order => order.id !== orderId);
            break;
          }
        }
        
        return {
          orders: updatedOrders,
          isLoading: false,
          selectedOrderId: state.selectedOrderId === orderId ? null : state.selectedOrderId,
          currentOrder: state.currentOrder?.id === orderId ? null : state.currentOrder
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete order';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  // 选择订单
  selectOrder: (orderId: string | null) => {
    set({ selectedOrderId: orderId });
    
    if (orderId) {
      // 遍历所有客户的订单查找目标订单
      const allOrders = Object.values(get().orders).flat();
      const order = allOrders.find((o) => o.id === orderId);
      set({ currentOrder: order || null });
    } else {
      set({ currentOrder: null });
    }
  },
  
  // 清除当前订单
  clearCurrentOrder: () => {
    set({ currentOrder: null, selectedOrderId: null });
  }
}));
