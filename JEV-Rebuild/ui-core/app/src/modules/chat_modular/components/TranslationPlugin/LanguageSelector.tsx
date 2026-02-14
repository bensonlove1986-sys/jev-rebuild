import React, { useState, useMemo } from 'react';
import { commonLanguages } from './TranslationPlugin';
import './LanguageSelector.css';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageSelect: (language: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  selectedLanguage, 
  onLanguageSelect 
}) => {
  const [showLanguageList, setShowLanguageList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('common');
  
  // 语言分组
  const languageGroups = useMemo(() => {
    return {
      common: {
        name: '常用语言',
        languages: commonLanguages
      },
      other: {
        name: '其他语言',
        languages: [
          { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
          { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
          { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
          { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili' },
          { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
          { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
          { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
          { code: 'ca', name: 'Catalan', nativeName: 'Català' },
          { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
          { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
          { code: 'da', name: 'Danish', nativeName: 'Dansk' },
          { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
          { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
          { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
          { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
          { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
          { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
          { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
          { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
          { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
          { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
          { code: 'it', name: 'Italian', nativeName: 'Italiano' },
          { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
          { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
          { code: 'ko', name: 'Korean', nativeName: '한국어' },
          { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
          { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
          { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
          { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
          { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
          { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
          { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
          { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
          { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
          { code: 'my', name: 'Myanmar (Burmese)', nativeName: 'ဗမာစာ' },
          { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
          { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
          { code: 'pl', name: 'Polish', nativeName: 'Polski' },
          { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
          { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
          { code: 'ro', name: 'Romanian', nativeName: 'Română' },
          { code: 'ru', name: 'Russian', nativeName: 'Русский' },
          { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
          { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
          { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
          { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
          { code: 'es', name: 'Spanish', nativeName: 'Español' },
          { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
          { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
          { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
          { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
          { code: 'th', name: 'Thai', nativeName: 'ไทย' },
          { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
          { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
          { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
          { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
          { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
          { code: 'zh', name: 'Chinese', nativeName: '中文' }
        ]
      }
    };
  }, []);
  
  // 过滤语言
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return languageGroups[selectedGroup as keyof typeof languageGroups].languages;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return languageGroups[selectedGroup as keyof typeof languageGroups].languages.filter(lang => 
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery, selectedGroup, languageGroups]);
  
  // 处理语言选择
  const handleLanguageSelect = (language: Language) => {
    onLanguageSelect(language);
    setShowLanguageList(false);
  };
  
  // 处理分组选择
  const handleGroupSelect = (group: string) => {
    setSelectedGroup(group);
  };
  
  return (
    <div className="language-selector">
      {/* 语言选择按钮 */}
      <button
        className="language-selector-button"
        onClick={() => setShowLanguageList(!showLanguageList)}
      >
        <span className="selected-language-name">
          {selectedLanguage.nativeName} ({selectedLanguage.code.toUpperCase()})
        </span>
        <span className="language-selector-arrow">
          {showLanguageList ? '▼' : '▶'}
        </span>
      </button>
      
      {/* 语言选择列表 */}
      {showLanguageList && (
        <div className="language-selector-dropdown">
          {/* 搜索框 */}
          <div className="language-selector-search">
            <input
              type="text"
              placeholder="搜索语言..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="language-selector-search-input"
            />
          </div>
          
          {/* 分组标签 */}
          <div className="language-selector-groups">
            <button
              className={`language-selector-group-btn ${selectedGroup === 'common' ? 'active' : ''}`}
              onClick={() => handleGroupSelect('common')}
            >
              常用语言
            </button>
            <button
              className={`language-selector-group-btn ${selectedGroup === 'other' ? 'active' : ''}`}
              onClick={() => handleGroupSelect('other')}
            >
              其他语言
            </button>
          </div>
          
          {/* 语言列表 */}
          <div className="language-selector-list">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((language) => (
                <button
                  key={language.code}
                  className={`language-selector-item ${selectedLanguage.code === language.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageSelect(language)}
                >
                  <span className="language-name">{language.name}</span>
                  <span className="language-native-name">{language.nativeName}</span>
                  <span className="language-code">{language.code.toUpperCase()}</span>
                </button>
              ))
            ) : (
              <div className="language-selector-empty">
                未找到匹配的语言
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
