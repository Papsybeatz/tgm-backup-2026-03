import React, { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GrantEditor from "./components/GrantEditor.jsx";

export default function App() {
  const [screen, setScreen] = useState("dashboard");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Sidebar onNavigate={setScreen} />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="p-6 overflow-y-auto">
          {screen === "dashboard" && <Dashboard />}
          {screen === "editor" && <GrantEditor />}
        </main>
      </div>
    </div>
  );
}
