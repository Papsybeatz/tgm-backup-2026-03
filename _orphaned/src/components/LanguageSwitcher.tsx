import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'en';

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            border: current === l.code ? 'none' : '1px solid var(--tgm-border)',
            background: current === l.code ? 'var(--tgm-gold)' : 'transparent',
            color: current === l.code ? 'var(--tgm-navy)' : 'var(--tgm-muted)',
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
