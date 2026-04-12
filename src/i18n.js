import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from './locales.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : 'en';
const defaultLanguage = savedLanguage || 'en';

console.log('i18n: Initializing with language:', defaultLanguage);

const resources = Object.keys(translations).reduce((acc, lang) => {
  acc[lang] = { translation: translations[lang] };
  return acc;
}, {});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    console.log('i18n: Initialized with language:', i18n.language);
  })
  .catch(err => {
    console.error('i18n: Initialization error:', err);
  });

export default i18n;
