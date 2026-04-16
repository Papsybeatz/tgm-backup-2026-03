import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from './locales.json';

const resources = Object.keys(translations).reduce((acc, lang) => {
  acc[lang] = { translation: translations[lang] };
  return acc;
}, {});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: [],
      caches: [],
    },
  });

export default i18n;