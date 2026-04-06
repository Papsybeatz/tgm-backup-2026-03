import { useI18n } from "@/hooks/useI18n";

export const LanguageSwitcher = () => {
  const { lang, setLang } = useI18n();

  const languages = [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
  ];

  return (
    <div className="flex gap-2 items-center">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1 rounded-md transition ${
            lang === l.code
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
