import React from "react";
import { Radar } from "react-chartjs-2";

export default function ScoringRadarChart({ subscores }) {
  // subscores: { clarity: 80, feasibility: 70, ... }
  const labels = Object.keys(subscores);
  const data = {
    labels,
    datasets: [
      {
        label: "Draft Score",
        data: Object.values(subscores),
        backgroundColor: "rgba(47,128,237,0.12)",
        borderColor: "#2f80ed",
        pointBackgroundColor: "#f2c94c",
        borderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };
  const options = {
    scale: {
      angleLines: { color: "#e0e7ef" },
      gridLines: { color: "#e0e7ef" },
      pointLabels: { font: { size: 14, weight: "bold" }, color: "#222" },
      ticks: { min: 0, max: 100, stepSize: 20, color: "#7f8fa6" },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    responsive: true,
    maintainAspectRatio: false,
  };
  return (
    <div style={{ width: "100%", height: 260, margin: "0 auto" }}>
      <Radar data={data} options={options} />
    </div>
  );
}
