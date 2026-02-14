import React from 'react';

interface CustomerInfoModalProps {
  visible: boolean;
  customer: any;
  onClose: () => void;
}

const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({ visible, customer, onClose }) => {
  if (!visible || !customer) return null;

  return (
    <div className="customer-info-modal-overlay" onClick={onClose}>
      <div className="customer-info-modal" onClick={(e) => e.stopPropagation()}>
        {/* 模态框头部 */}
        <div className="customer-info-modal-header">
          <h3>客户信息</h3>
          <button className="customer-info-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        {/* 模态框内容 */}
        <div className="customer-info-modal-content">
          {/* 基本信息 */}
          <div className="customer-info-section">
            <h4>基本信息</h4>
            <div className="customer-info-item">
              <span className="customer-info-label">姓名</span>
              <span className="customer-info-value">
                {/* 🔴 修复：调整 displayName 优先级为：stable_name > customer_name > real_name > display_name > 未命名客户 */}
                {customer.stable_name || customer.customer_name || customer.real_name || customer.display_name || customer.safeDisplayName || '未命名客户'}
              </span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">客户ID</span>
              <span className="customer-info-value">{customer.customer_id}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">来源</span>
              <span className="customer-info-value">{customer.source || '未知'}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">阶段</span>
              <span className="customer-info-value">{customer.stage || 'CHAT'}</span>
            </div>
          </div>
          
          {/* 联系方式 */}
          <div className="customer-info-section">
            <h4>联系方式</h4>
            <div className="customer-info-item">
              <span className="customer-info-label">手机</span>
              <span className="customer-info-value">{customer.phone || customer.formatted_phone || '未提供'}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">邮箱</span>
              <span className="customer-info-value">{customer.email || '未提供'}</span>
            </div>
          </div>
          
          {/* 其他信息 */}
          <div className="customer-info-section">
            <h4>其他信息</h4>
            <div className="customer-info-item">
              <span className="customer-info-label">国家</span>
              <span className="customer-info-value">{customer.country || '未提供'}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">公司</span>
              <span className="customer-info-value">{customer.company || '未提供'}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">语言</span>
              <span className="customer-info-value">{customer.language || '未检测'}</span>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">上次联系</span>
              <span className="customer-info-value">
                {customer.last_message_at ? new Date(customer.last_message_at).toLocaleString() : '无'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 模态框底部 */}
        <div className="customer-info-modal-footer">
          <button className="customer-info-modal-close-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      
      {/* 样式 */}
      <style jsx>{`
        .customer-info-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .customer-info-modal {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .customer-info-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .customer-info-modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
        }
        
        .customer-info-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }
        
        .customer-info-modal-close:hover {
          color: #666;
        }
        
        .customer-info-modal-content {
          padding: 20px;
        }
        
        .customer-info-section {
          margin-bottom: 20px;
        }
        
        .customer-info-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          border-left: 3px solid #1890ff;
          padding-left: 8px;
        }
        
        .customer-info-item {
          display: flex;
          margin-bottom: 12px;
        }
        
        .customer-info-label {
          width: 80px;
          font-size: 14px;
          color: #999;
        }
        
        .customer-info-value {
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        
        .customer-info-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: flex-end;
        }
        
        .customer-info-modal-close-btn {
          padding: 8px 16px;
          background-color: #f5f5f5;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          color: #666;
        }
        
        .customer-info-modal-close-btn:hover {
          background-color: #e6f7ff;
          border-color: #91d5ff;
          color: #1890ff;
        }
      `}</style>
    </div>
  );
};

export default CustomerInfoModal;