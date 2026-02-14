import React, { useState, useEffect } from 'react';
import { safeFetch } from '../../../../main';
import './ExcelSummaryBubble.css';

interface ExcelSummaryBubbleProps {
  message: {
    media_path: string;
    timestamp: number;
    direction: 'inbound' | 'outbound';
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
  };
}

interface ExcelSummary {
  items: number;
  total_qty: number;
  detected_currency: string;
}

const ExcelSummaryBubble: React.FC<ExcelSummaryBubbleProps> = ({ message }) => {
  const [summary, setSummary] = useState<ExcelSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const analyzeExcel = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await safeFetch('/api/media/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_path: message.media_path
        })
      });

      if (!response.ok) {
        throw new Error('分析 Excel 文件失败');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('分析 Excel 错误:', err);
      setError('无法分析 Excel 文件');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(message.media_path, '_blank');
  };

  useEffect(() => {
    analyzeExcel();
  }, [message.media_path]);

  console.log('[MEDIA_RENDER_MODE] spreadsheet-summary');

  return (
    <div className="excel-summary-bubble">
      <div className="excel-summary-content">
        <div className="excel-summary-header">
          <div className="excel-icon">📊</div>
          <h4>报价摘要</h4>
        </div>
        
        {isLoading ? (
          <div className="excel-summary-loading">
            <div className="loading-spinner"></div>
            <p>分析 Excel 文件...</p>
          </div>
        ) : error ? (
          <div className="excel-summary-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        ) : summary ? (
          <div className="excel-summary-details">
            <div className="summary-item">
              <span className="summary-label">行数:</span>
              <span className="summary-value">{summary.items}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">总数量:</span>
              <span className="summary-value">{summary.total_qty}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">币种:</span>
              <span className="summary-value">{summary.detected_currency}</span>
            </div>
          </div>
        ) : (
          <div className="excel-summary-empty">
            <p>无法生成报价摘要</p>
          </div>
        )}
        
        <button 
          className="excel-download-btn"
          onClick={handleDownload}
        >
          [ 下载文件 ]
        </button>
      </div>
      <div className="excel-summary-meta">
        <span className="message-time">
          {formatTime(message.timestamp)}
        </span>
        {message.direction === 'outbound' && (
          <span className={`message-status message-status-${message.status}`}>
            {message.status === 'sending' && '⏳'}
            {message.status === 'sent' && '✓'}
            {message.status === 'delivered' && '✓✓'}
            {message.status === 'read' && '✓✓'}
            {message.status === 'failed' && '❌'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ExcelSummaryBubble;