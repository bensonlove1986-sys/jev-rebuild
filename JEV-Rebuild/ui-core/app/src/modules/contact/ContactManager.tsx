import React, { useState, useEffect } from 'react';
import { useContactStore } from '../chat_modular/store/contactStore';
import { JEV_RUNTIME } from '../../core/jev_runtime_config';
import whatsAppInboxService from '../../services/WhatsAppInboxService';
import './ContactManager.css';

// 联系人状态类型
type ContactStatus = 'online' | 'offline' | 'away' | 'busy';

// 联系人实体类型
interface Contact {
  id: string;                 // 联系人ID
  name: string;               // 联系人名称
  phone: string;              // 联系电话
  avatar?: string;            // 联系人头像
  status?: string;            // 联系人状态文本
  onlineStatus: ContactStatus; // 在线状态
  lastSeen?: number;          // 最后在线时间
  isBlocked?: boolean;        // 是否被阻止
  isFavorited?: boolean;      // 是否收藏
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  email?: string;             // 联系邮箱
  country?: string;           // 国家
  countryCode?: string;       // 国家代码
  tags?: string[];            // 标签
  isGroup?: boolean;          // 是否为群聊
  groupSize?: number;         // 群聊人数
}

const ContactManager: React.FC = () => {
  const {
    contacts,
    filteredContacts,
    searchQuery,
    setSearchQuery,
    addContact,
    removeContact,
    updateContact,
    isLoadingContacts,
    setIsLoadingContacts
  } = useContactStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    phone: '',
    avatar: '',
    status: '',
    onlineStatus: 'offline',
    isBlocked: false,
    isFavorited: false,
    email: '',
    country: '',
    countryCode: '',
    tags: [],
    isGroup: false,
    groupSize: 0
  });

  const [editContact, setEditContact] = useState<Contact | null>(null);

  useEffect(() => {
    // 模拟加载联系人数据
    setIsLoadingContacts(true);
    setTimeout(() => {
      // 添加一些示例联系人
      const sampleContacts: Contact[] = [
        {
          id: '1',
          name: '张三',
          phone: '13800138001',
          avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20business%20avatar%20male%20chinese&image_size=square',
          status: '在线',
          onlineStatus: 'online',
          lastSeen: Date.now(),
          isBlocked: false,
          isFavorited: true,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
          email: 'zhangsan@example.com',
          country: '中国',
          countryCode: '+86',
          tags: ['工作', '朋友'],
          isGroup: false
        },
        {
          id: '2',
          name: '李四',
          phone: '13900139002',
          avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20business%20avatar%20female%20chinese&image_size=square',
          status: '忙碌',
          onlineStatus: 'busy',
          lastSeen: Date.now() - 3600000,
          isBlocked: false,
          isFavorited: false,
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 7200000,
          email: 'lisi@example.com',
          country: '中国',
          countryCode: '+86',
          tags: ['工作'],
          isGroup: false
        },
        {
          id: '3',
          name: '王五',
          phone: '13700137003',
          avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20business%20avatar%20male%20chinese%20glasses&image_size=square',
          status: '离开',
          onlineStatus: 'away',
          lastSeen: Date.now() - 7200000,
          isBlocked: false,
          isFavorited: false,
          createdAt: Date.now() - 259200000,
          updatedAt: Date.now() - 14400000,
          email: 'wangwu@example.com',
          country: '中国',
          countryCode: '+86',
          tags: ['朋友'],
          isGroup: false
        },
        {
          id: '4',
          name: '家庭群',
          phone: '',
          avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=family%20group%20avatar%20happy%20people&image_size=square',
          status: '群聊',
          onlineStatus: 'offline',
          createdAt: Date.now() - 345600000,
          updatedAt: Date.now() - 21600000,
          isBlocked: false,
          isFavorited: true,
          tags: ['家庭'],
          isGroup: true,
          groupSize: 5
        }
      ];

      // 添加示例联系人到 store
      sampleContacts.forEach(contact => {
        addContact(contact);
      });

      setIsLoadingContacts(false);
    }, 1000);
  }, [addContact, setIsLoadingContacts]);

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      const contact: Contact = {
        ...newContact,
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      addContact(contact);
      setNewContact({
        name: '',
        phone: '',
        avatar: '',
        status: '',
        onlineStatus: 'offline',
        isBlocked: false,
        isFavorited: false,
        email: '',
        country: '',
        countryCode: '',
        tags: [],
        isGroup: false,
        groupSize: 0
      });
      setShowAddModal(false);
    }
  };

  const handleEditContact = () => {
    if (editContact) {
      updateContact(editContact.id, editContact);
      setShowEditModal(false);
      setSelectedContact(null);
      setEditContact(null);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('确定要删除这个联系人吗？')) {
      try {
        console.log("[UI_CONTACT_DELETE_REQ]", contactId);
        
        // 调用后端删除接口
        const response = await fetch(`${JEV_RUNTIME.API_BASE}/inbox/contact?customer_id=${encodeURIComponent(contactId)}`, {
          method: "DELETE"
        });
        
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("[UI_CONTACT_DELETE_OK]", result.customer_id);
        
        // 成功后刷新联系人列表
        await whatsAppInboxService.loadContactList();
        console.log("[UI_CONTACT_LIST_REFRESHED]");
        
      } catch (error) {
        console.error("[UI_CONTACT_DELETE_ERROR]", error);
        // 即使失败也刷新联系人列表
        await whatsAppInboxService.loadContactList();
      }
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const openEditModal = (contact: Contact) => {
    setSelectedContact(contact);
    setEditContact({ ...contact });
    setShowEditModal(true);
  };

  return (
    <div className="contact-manager">
      <div className="contact-header">
        <h1>联系人管理</h1>
        <button className="add-contact-btn" onClick={() => setShowAddModal(true)}>
          <span className="plus-icon">+</span> 添加联系人
        </button>
      </div>

      <div className="contact-search">
        <div className="search-container">
          <input
            type="text"
            placeholder="搜索联系人..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
        </div>
        <div className="contact-count">
          找到 {filteredContacts.length} 个联系人
        </div>
      </div>

      <div className="contact-list">
        {isLoadingContacts ? (
          <div className="loading">加载中...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📇</div>
            <h3>暂无联系人</h3>
            <p>点击 "添加联系人" 按钮开始添加</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-avatar">
                <img src={contact.avatar || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=default%20avatar%20placeholder&image_size=square'} alt={contact.name} />
                <span className={`status-indicator ${contact.onlineStatus}`}></span>
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {contact.name}
                  {contact.isFavorited && <span className="favorite-icon">⭐</span>}
                  {contact.isGroup && <span className="group-icon">👥</span>}
                </div>
                <div className="contact-details">
                  <p className="contact-phone">{contact.phone}</p>
                  {contact.email && <p className="contact-email">{contact.email}</p>}
                  <p className="contact-status">
                    {contact.status || 
                     (contact.onlineStatus === 'online' ? '在线' : 
                      contact.onlineStatus === 'busy' ? '忙碌' : 
                      contact.onlineStatus === 'away' ? '离开' : '离线')}
                  </p>
                </div>
              </div>
              <div className="contact-actions">
                <button className="edit-btn" onClick={() => openEditModal(contact)}>
                  编辑
                </button>
                <button className="delete-btn" onClick={() => handleDeleteContact(contact.id)}>
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加联系人模态框 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>添加联系人</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="输入联系人姓名"
                />
              </div>
              <div className="form-group">
                <label>电话 *</label>
                <input
                  type="text"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="输入联系电话"
                />
              </div>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="输入联系邮箱"
                />
              </div>
              <div className="form-group">
                <label>状态</label>
                <input
                  type="text"
                  value={newContact.status}
                  onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}
                  placeholder="输入状态信息"
                />
              </div>
              <div className="form-group">
                <label>在线状态</label>
                <select
                  value={newContact.onlineStatus}
                  onChange={(e) => setNewContact({ ...newContact, onlineStatus: e.target.value as any })}
                >
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                  <option value="busy">忙碌</option>
                  <option value="away">离开</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="save-btn" onClick={handleAddContact}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑联系人模态框 */}
      {showEditModal && editContact && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>编辑联系人</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={editContact.name}
                  onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                  placeholder="输入联系人姓名"
                />
              </div>
              <div className="form-group">
                <label>电话 *</label>
                <input
                  type="text"
                  value={editContact.phone}
                  onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                  placeholder="输入联系电话"
                />
              </div>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={editContact.email}
                  onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  placeholder="输入联系邮箱"
                />
              </div>
              <div className="form-group">
                <label>状态</label>
                <input
                  type="text"
                  value={editContact.status}
                  onChange={(e) => setEditContact({ ...editContact, status: e.target.value })}
                  placeholder="输入状态信息"
                />
              </div>
              <div className="form-group">
                <label>在线状态</label>
                <select
                  value={editContact.onlineStatus}
                  onChange={(e) => setEditContact({ ...editContact, onlineStatus: e.target.value as any })}
                >
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                  <option value="busy">忙碌</option>
                  <option value="away">离开</option>
                </select>
              </div>
              <div className="form-group">
                <label>收藏</label>
                <input
                  type="checkbox"
                  checked={editContact.isFavorited || false}
                  onChange={(e) => setEditContact({ ...editContact, isFavorited: e.target.checked })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)}>
                取消
              </button>
              <button className="save-btn" onClick={handleEditContact}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;