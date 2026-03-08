import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'workwise-theme';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
});

function getStoredTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const setTheme = (value) => {
    const next = value === 'light' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: getStoredTheme(),
      setTheme: (value) => {
        const next = value === 'light' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }));
      },
    };
  }
  return context;
}
