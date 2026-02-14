import React, { useState, useEffect, useCallback } from 'react';
import { LogLevels, logStore } from '../utils/structuredLogger';

// 本地定义LogEntry类型，避免导入问题
interface LogEntry {
  timestamp: number;
  level: number;
  levelName: string;
  prefix?: string;
  message: string;
  data?: any;
  component?: string;
}

interface LogViewerProps {
  visible: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<number>(LogLevels.DEBUG);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // 日志颜色映射
  const levelColors: Record<string, string> = {
    DEBUG: '#6c757d',
    INFO: '#17a2b8',
    WARN: '#ffc107',
    ERROR: '#dc3545',
    FATAL: '#856404'
  };

  // 加载日志
  const loadLogs = useCallback(() => {
    setLogs(logStore.getLogs());
  }, []);

  // 监听日志变化
  useEffect(() => {
    if (visible) {
      loadLogs();
      logStore.addListener(loadLogs);
    }

    return () => {
      logStore.removeListener(loadLogs);
    };
  }, [visible, loadLogs]);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesLevel = log.level >= filterLevel;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.component && log.component.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.prefix && log.prefix.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  // 清空日志
  const handleClearLogs = () => {
    logStore.clearLogs();
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      millisecond: '3-digit'
    });
  };

  // 日志滚动到底部
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">实时日志查看</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              清空日志
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              关闭
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-100 p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="level-filter" className="text-sm font-medium text-gray-700">
              日志级别：
            </label>
            <select
              id="level-filter"
              value={filterLevel}
              onChange={(e) => setFilterLevel(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={LogLevels.DEBUG}>DEBUG</option>
              <option value={LogLevels.INFO}>INFO</option>
              <option value={LogLevels.WARN}>WARN</option>
              <option value={LogLevels.ERROR}>ERROR</option>
              <option value={LogLevels.FATAL}>FATAL</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <label htmlFor="search" className="text-sm font-medium text-gray-700">
              搜索：
            </label>
            <input
              id="search"
              type="text"
              placeholder="搜索日志消息、组件或前缀..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="auto-scroll"
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="auto-scroll" className="text-sm font-medium text-gray-700">
              自动滚动
            </label>
          </div>
        </div>

        {/* Logs Container */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-sm"
          style={{
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
          }}
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              暂无日志
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className="bg-white p-3 rounded shadow-sm border-l-4"
                  style={{ borderLeftColor: levelColors[log.levelName] || '#6c757d' }}
                >
                  <div className="flex flex-wrap items-center text-xs text-gray-500 mb-1">
                    <span className="mr-3">{formatTimestamp(log.timestamp)}</span>
                    <span
                      className="px-2 py-0.5 rounded-full font-bold"
                      style={{ color: levelColors[log.levelName] || '#6c757d' }}
                    >
                      {log.levelName}
                    </span>
                    {log.prefix && (
                      <span className="mx-2">|</span>
                    )}
                    {log.prefix && (
                      <span className="font-semibold">{log.prefix}</span>
                    )}
                    {log.component && (
                      <>
                        <span className="mx-2">|</span>
                        <span className="text-blue-600">{log.component}</span>
                      </>
                    )}
                  </div>
                  <div className="text-gray-800 break-words">{log.message}</div>
                  {log.data && (
                    <div className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                      <pre className="text-xs text-gray-600 m-0">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-3 text-center text-xs text-gray-500">
          显示 {filteredLogs.length} / {logs.length} 条日志
        </div>
      </div>
    </div>
  );
};

export default LogViewer;