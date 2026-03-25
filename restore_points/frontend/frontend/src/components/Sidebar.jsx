import React from "react";
import { FiHome, FiFileText, FiSettings, FiEdit3 } from "react-icons/fi";

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">GrantsMaster</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavItem icon={<FiHome />} label="Dashboard" onClick={() => onNavigate && onNavigate("dashboard")} />
        <NavItem icon={<FiFileText />} label="Grant Drafts" />
        <NavItem icon={<FiEdit3 />} label="Draft Editor" onClick={() => onNavigate && onNavigate("editor")} />
        <NavItem icon={<FiSettings />} label="Settings" />
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 text-gray-700"
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
