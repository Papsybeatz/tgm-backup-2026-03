export const verifyI18nProvider = () => {
  const hasI18n = (window as any).__I18N_INITIALIZED__;

  if (!hasI18n) {
    console.error(
      "[ED] Missing I18nProvider detected. Auto-patch recommended."
    );
  }
};
