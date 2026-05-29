'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/storage';
import type { Settings } from '@/lib/types';

interface AppContextType {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    const dark = localStorage.getItem('pcp_dark_mode') === 'true';
    setDarkMode(dark);
    if (dark) document.documentElement.classList.add('dark');
  }, []);

  const updateSettings = (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('pcp_dark_mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, darkMode, toggleDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
