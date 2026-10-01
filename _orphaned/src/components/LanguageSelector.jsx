import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    localStorage.setItem('language', lng);
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.language || localStorage.getItem('language') || 'en';
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' }
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label="Language selector">
      {languages.map(({ code, label }) => (
        <button 
          key={code}
          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
            currentLang === code 
              ? 'bg-[#004aad] text-white' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          onClick={() => changeLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
