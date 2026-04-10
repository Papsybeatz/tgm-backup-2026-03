import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = ({ className = '' }) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label={t ? t('language') : 'Language selector'}>
      <button className="text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => changeLanguage('en')}>EN</button>
      <button className="text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => changeLanguage('es')}>ES</button>
    </div>
  );
};

export default LanguageSelector;
