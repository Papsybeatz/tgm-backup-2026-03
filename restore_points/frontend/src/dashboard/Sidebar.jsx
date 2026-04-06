import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();

  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Drafts", path: "/dashboard/drafts" },
    { name: "Opportunities", path: "/dashboard/opportunities" },
    { name: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 text-2xl font-bold text-blue-600">
        The Grants Master
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-2 rounded-lg font-medium transition ${
              pathname === item.path
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
