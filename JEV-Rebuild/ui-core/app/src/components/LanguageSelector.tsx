import React, { useState, useRef, useEffect } from 'react';
import './LanguageSelector.css';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSelectorProps {
  languages: Language[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  value,
  onChange,
  placeholder = 'Select language',
  label,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  
  // 自动检测选项
  const AUTO_DETECT_OPTION = { code: 'auto', name: '自动检测', nativeName: 'Auto Detect' };
  
  // 过滤语言列表
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchText.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchText.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchText.toLowerCase())
  );
  
  // 查找当前选中的语言
  useEffect(() => {
    if (value === 'auto') {
      setSelectedLanguage(AUTO_DETECT_OPTION);
    } else {
      const lang = languages.find(l => l.code === value);
      setSelectedLanguage(lang || null);
    }
  }, [value, languages]);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 处理语言选择
  const handleLanguageSelect = (lang: Language | typeof AUTO_DETECT_OPTION) => {
    onChange(lang.code);
    setIsOpen(false);
    setSearchText('');
  };
  
  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  return (
    <div ref={selectorRef} className="language-selector-container">
      {label && <label className="language-selector-label">{label}</label>}
      
      <div className="language-selector">
        {/* 选择器输入框 */}
        <div 
          className={`language-selector-input ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="language-selector-selected">
            {selectedLanguage ? (
              <>
                <span className="language-selector-flag">
                  {selectedLanguage.code === 'auto' ? '🔄' : selectedLanguage.nativeName}
                </span>
                <span className="language-selector-text">
                  {selectedLanguage.name}
                </span>
              </>
            ) : (
              <span className="language-selector-placeholder">
                {placeholder}
              </span>
            )}
          </div>
          <div className="language-selector-arrow">
            {isOpen ? '▲' : '▼'}
          </div>
        </div>
        
        {/* 下拉菜单 */}
        {isOpen && (
          <div 
            className="language-selector-dropdown"
            onKeyDown={handleKeyDown}
          >
            {/* 搜索框 */}
            <div className="language-selector-search">
              <input
                type="text"
                placeholder="搜索语言..."
                value={searchText}
                onChange={handleSearchChange}
                className="language-selector-search-input"
                autoFocus
              />
            </div>
            
            {/* 语言列表 */}
            <div className="language-selector-list">
              {/* 自动检测选项 */}
              <div 
                className={`language-selector-option ${value === 'auto' ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(AUTO_DETECT_OPTION)}
              >
                <span className="language-selector-option-flag">🔄</span>
                <span className="language-selector-option-name">{AUTO_DETECT_OPTION.name}</span>
                <span className="language-selector-option-native">{AUTO_DETECT_OPTION.nativeName}</span>
              </div>
              
              {/* 分隔线 */}
              <div className="language-selector-divider"></div>
              
              {/* 语言选项 */}
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map(lang => (
                  <div 
                    key={lang.code}
                    className={`language-selector-option ${value === lang.code ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(lang)}
                  >
                    <span className="language-selector-option-flag">
                      {lang.nativeName}
                    </span>
                    <span className="language-selector-option-name">{lang.name}</span>
                    <span className="language-selector-option-native">{lang.nativeName}</span>
                  </div>
                ))
              ) : (
                <div className="language-selector-no-results">
                  没有找到匹配的语言
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;