/**
 * 模块名称：MailerManager（邮件模块）
 * 功能：邮件自动生成与发送、AI辅助撰写、模板管理
 * 依赖模块：config.js, api.js, logger.js
 * 作者：JEV 系统
 */

import { CONFIG } from '../core/config.js';
import api from '../core/api.js';
import logger from '../core/logger.js';
import { formatTimestamp, generateRandomId, safeJsonParse } from '../core/utils.js';

class MailerManager {
    constructor() {
        this.templates = [];
        this.sentMails = [];
        this.isInitialized = false;
    }

    /**
     * 初始化邮件模块
     */
    async init() {
        try {
            await this.loadTemplates();
            this.isInitialized = true;
            logger.success('邮件模块初始化完成', 'mailer');
            return true;
        } catch (error) {
            logger.error(`邮件模块初始化失败: ${error.message}`, 'mailer');
            return false;
        }
    }

    /**
     * 加载邮件模板
     */
    async loadTemplates() {
        try {
            // 从API加载模板或使用默认模板
            try {
                const response = await api.get('/mail/templates');
                this.templates = response.data || [];
                logger.info(`从服务器加载了${this.templates.length}个邮件模板`, 'mailer');
            } catch (apiError) {
                // 使用默认模板
                this.templates = this.getDefaultTemplates();
                logger.info('使用默认邮件模板', 'mailer');
            }
            
            return this.templates;
        } catch (error) {
            logger.error(`加载模板失败: ${error.message}`, 'mailer');
            return this.getDefaultTemplates();
        }
    }

    /**
     * 获取默认邮件模板
     */
    getDefaultTemplates() {
        return [
            {
                id: 'welcome',
                name: '欢迎邮件',
                subject: '欢迎使用JEV智能系统',
                content: '尊敬的{customerName}：\n\n欢迎您使用JEV智能自动化系统。\n\n如有任何问题，请随时联系我们的客服团队。\n\n祝好，\nJEV系统团队'
            },
            {
                id: 'support',
                name: '客服支持',
                subject: '您的问题已收到',
                content: '尊敬的{customerName}：\n\n感谢您的咨询。我们已经收到您的问题：\n\n{question}\n\n客服团队将在24小时内为您回复。\n\n祝好，\nJEV客服团队'
            }
        ];
    }

    /**
     * 使用AI生成邮件内容
     * @param {object} params - 参数对象
     * @param {string} params.context - 上下文信息
     * @param {string} params.recipient - 收件人信息
     * @param {string} params.purpose - 邮件目的
     */
    async generateEmailWithAI(params) {
        try {
            logger.info(`使用AI生成邮件内容，目的: ${params.purpose}`, 'mailer');
            
            const response = await api.post('/ai/generate_email', {
                context: params.context,
                recipient: params.recipient,
                purpose: params.purpose,
                tone: params.tone || 'professional'
            });
            
            if (response.success) {
                logger.success('AI邮件生成成功', 'mailer');
                return {
                    subject: response.data.subject,
                    content: response.data.content
                };
            } else {
                throw new Error('AI生成失败');
            }
        } catch (error) {
            logger.error(`AI邮件生成失败: ${error.message}`, 'mailer');
            throw error;
        }
    }

    /**
     * 发送邮件
     * @param {object} mailConfig - 邮件配置
     */
    async sendEmail(mailConfig) {
        try {
            const mailId = generateRandomId(12);
            const timestamp = new Date().toISOString();
            
            const mailData = {
                id: mailId,
                to: mailConfig.to,
                cc: mailConfig.cc || [],
                bcc: mailConfig.bcc || [],
                subject: mailConfig.subject,
                content: mailConfig.content,
                html: mailConfig.html || null,
                attachments: mailConfig.attachments || [],
                timestamp: timestamp,
                status: 'pending'
            };
            
            // 通过API发送邮件
            const response = await api.post('/mail/send', mailData);
            
            if (response.success) {
                mailData.status = 'sent';
                this.sentMails.push(mailData);
                logger.success(`邮件发送成功: ${mailId}`, 'mailer');
                
                // 触发事件
                window.dispatchEvent(new CustomEvent('jev:mail:sent', {
                    detail: mailData
                }));
                
                return mailData;
            } else {
                throw new Error(response.message || '发送失败');
            }
        } catch (error) {
            logger.error(`邮件发送失败: ${error.message}`, 'mailer');
            throw error;
        }
    }

    /**
     * 使用模板发送邮件
     * @param {string} templateId - 模板ID
     * @param {object} data - 替换数据
     * @param {object} mailConfig - 邮件配置
     */
    async sendEmailWithTemplate(templateId, data, mailConfig) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error(`模板不存在: ${templateId}`);
            }
            
            // 替换模板变量
            let subject = template.subject;
            let content = template.content;
            
            Object.keys(data).forEach(key => {
                const placeholder = `{${key}}`;
                subject = subject.replace(new RegExp(placeholder, 'g'), data[key]);
                content = content.replace(new RegExp(placeholder, 'g'), data[key]);
            });
            
            // 发送邮件
            return await this.sendEmail({
                ...mailConfig,
                subject,
                content
            });
        } catch (error) {
            logger.error(`使用模板发送邮件失败: ${error.message}`, 'mailer');
            throw error;
        }
    }

    /**
     * 获取已发送邮件列表
     * @param {number} limit - 限制数量
     */
    getSentMails(limit = 50) {
        return [...this.sentMails].reverse().slice(0, limit);
    }

    /**
     * 导出邮件日志
     */
    exportMailLog() {
        try {
            const csvContent = this.sentMails.map(mail => [
                mail.id,
                mail.timestamp,
                mail.to.join(','),
                mail.subject,
                mail.status
            ].join(',')).join('\n');
            
            const headers = ['ID', '时间戳', '收件人', '主题', '状态'].join(',');
            const fullContent = headers + '\n' + csvContent;
            
            const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jev-mail-log-${formatTimestamp(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            logger.info('邮件日志导出成功', 'mailer');
            return true;
        } catch (error) {
            logger.error(`邮件日志导出失败: ${error.message}`, 'mailer');
            return false;
        }
    }

    /**
     * 获取模块状态
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            templateCount: this.templates.length,
            sentCount: this.sentMails.length
        };
    }

    /**
     * 销毁模块
     */
    destroy() {
        this.templates = [];
        this.sentMails = [];
        this.isInitialized = false;
        logger.info('邮件模块已销毁', 'mailer');
    }
}

// 导出单例实例
const mailerManager = new MailerManager();
export default mailerManager;