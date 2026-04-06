import React, { useEffect, useState } from "react";

export default function TooltipWrapper({ children, tooltip, show, autoDismiss = 5000, placement = "top" }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [show, autoDismiss]);

  return (
    <span className="relative group" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && tooltip && (
        <span
          className={`absolute whitespace-pre-line bg-black text-white text-xs rounded px-2 py-1 z-50 pointer-events-none transition duration-200 ${placement === "top" ? "-top-8 left-1/2 -translate-x-1/2" : "top-full left-1/2 -translate-x-1/2 mt-2"}`}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
