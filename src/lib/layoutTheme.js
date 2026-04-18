// Platform-level layout variant context
// Reads from localStorage (set by PlatformSettings).
// Provides a React context so all components can read the current layout.

import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'bt_platform_layout';

export const LAYOUTS = {
  default: { label: 'Default', description: 'Standard card layout with borders and shadows' },
  compact: { label: 'Compact', description: 'Denser rows with less padding — fits more on screen' },
  minimal: { label: 'Minimal', description: 'Clean, borderless cards with subtle separators' },
  bold: { label: 'Bold', description: 'Strong colour bands and prominent typography' },
};

const LayoutThemeContext = createContext({ layout: 'default', setLayout: () => {} });

export function LayoutThemeProvider({ children }) {
  const [layout, setLayoutState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  });

  const setLayout = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setLayoutState(value);
  };

  return (
    <LayoutThemeContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutThemeContext.Provider>
  );
}

export function useLayoutTheme() {
  return useContext(LayoutThemeContext);
}