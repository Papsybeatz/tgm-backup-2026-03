import { createContext, useContext, useState, useEffect } from "react";

const SkinContext = createContext(null);

export function SkinProvider({ children }) {
  const [skin, setSkinState] = useState("default");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skin');
      if (saved === 'futuristic' || saved === 'default') {
        setSkinState(saved);
      }
    }
  }, []);

  const toggleSkin = () => {
    setSkinState((s) => {
      const newSkin = s === "default" ? "futuristic" : "default";
      localStorage.setItem('skin', newSkin);
      return newSkin;
    });
  };

  useEffect(() => {
    document.body.className = `skin-${skin}`;
  }, [skin]);

  return (
    <SkinContext.Provider value={{ skin, toggleSkin }}>
      <div className={`skin-${skin}`}>
        {children}
      </div>
    </SkinContext.Provider>
  );
}

export function useSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    throw new Error('useSkin must be used within SkinProvider');
  }
  return context;
}