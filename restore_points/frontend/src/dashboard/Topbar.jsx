
import { Link } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 ml-64">
      <h1 className="text-xl font-semibold text-gray-800">
        Dashboard
      </h1>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        <Link
          to="/dashboard/workspace"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          New Grant
        </Link>
      </div>
    </header>
  );
}
