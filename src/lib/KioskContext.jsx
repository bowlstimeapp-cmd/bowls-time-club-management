import { createContext, useContext } from 'react';

export const KioskContext = createContext({ isKiosk: false, kioskMember: null });

export const useKiosk = () => useContext(KioskContext);