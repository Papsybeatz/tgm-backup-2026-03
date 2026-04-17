import React from "react";
import { FiFileText, FiClock, FiCheckCircle, FiPlus } from "react-icons/fi";

export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Your Grant Workspace</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
          <FiPlus /> New Draft
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard
          icon={<FiFileText className="text-blue-500" />}
          title="Drafts"
          value={12}
          description="Active grant drafts in progress."
        />
        <DashboardCard
          icon={<FiClock className="text-yellow-500" />}
          title="Pending"
          value={3}
          description="Grants awaiting review."
        />
        <DashboardCard
          icon={<FiCheckCircle className="text-green-500" />}
          title="Completed"
          value={8}
          description="Successfully submitted grants."
        />
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, description }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-gray-200">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-lg font-semibold text-gray-700">{title}</span>
      </div>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      <span className="text-gray-500">{description}</span>
    </div>
  );
}
