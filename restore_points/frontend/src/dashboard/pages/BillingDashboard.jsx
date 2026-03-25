// src/dashboard/pages/BillingDashboard.jsx
import { useEffect, useState } from "react";
import apiClient from '../../api/apiClient';

export default function BillingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const json = await apiClient('/api/billing/dashboard');
        setData(json);
      } catch (err) {
        setError("Failed to load billing data.");
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">AI Billing Dashboard</h2>
      <div className="mb-6">
        <strong>Total Monthly Cost:</strong> ${data.totalCost.toFixed(2)}
      </div>
      <div className="mb-6">
        <strong>Cost Per Provider:</strong>
        <ul>
          {Object.entries(data.perProvider).map(([provider, cost]) => (
            <li key={provider}>{provider}: ${cost.toFixed(2)}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <strong>Top 10 Users:</strong>
        <ul>
          {data.topUsers.map(u => (
            <li key={u.userId}>{u.userId}: ${u.cost.toFixed(2)}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <strong>Monthly Totals:</strong>
        <ul>
          {Object.entries(data.monthly).map(([month, cost]) => (
            <li key={month}>Month {parseInt(month) + 1}: ${cost.toFixed(2)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
