import { Outlet } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";

export const LanguageLayout = () => {
  const { lang } = useI18n();

  const supported = ["en", "fr", "es"];

  if (!supported.includes(lang)) {
    return (
      <div className="p-6 text-center text-red-600">
        Unsupported language: {lang}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
    </div>
  );
};
