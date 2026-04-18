import React, { createContext, useContext, useState } from 'react';

const KioskContext = createContext({ kioskMember: null, setKioskMember: () => {} });

export function KioskProvider({ children }) {
  const [kioskMember, setKioskMember] = useState(null);
  return (
    <KioskContext.Provider value={{ kioskMember, setKioskMember }}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  return useContext(KioskContext);
}