/**
 * Senior Experience Mode Context
 *
 * When enabled, the app renders entirely different page layouts
 * and navigation designed for members aged 65+.
 *
 * Stored in localStorage under 'bt_senior_mode'.
 */

import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'bt_senior_mode';
const SeniorModeContext = createContext({ seniorMode: false, setSeniorMode: () => {} });

export function SeniorModeProvider({ children }) {
  const [seniorMode, setSeniorModeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const setSeniorMode = (value) => {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    setSeniorModeState(value);
  };

  return (
    <SeniorModeContext.Provider value={{ seniorMode, setSeniorMode }}>
      {children}
    </SeniorModeContext.Provider>
  );
}

export function useSeniorMode() {
  return useContext(SeniorModeContext);
}