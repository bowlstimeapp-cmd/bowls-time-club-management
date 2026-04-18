// Club-level colour theme context
// Applied when a user is viewing a specific club.

import React, { createContext, useContext, useState } from 'react';

export const CLUB_THEMES = {
  emerald: {
    label: 'Emerald (Default)',
    accent: 'emerald',
    preview: 'bg-emerald-500',
    classes: {
      bg: 'bg-emerald-50',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      ring: 'ring-emerald-500',
    },
  },
  blue: {
    label: 'Royal Blue',
    accent: 'blue',
    preview: 'bg-blue-500',
    classes: {
      bg: 'bg-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      ring: 'ring-blue-500',
    },
  },
  purple: {
    label: 'Purple',
    accent: 'purple',
    preview: 'bg-purple-500',
    classes: {
      bg: 'bg-purple-50',
      button: 'bg-purple-600 hover:bg-purple-700',
      badge: 'bg-purple-100 text-purple-800',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      ring: 'ring-purple-500',
    },
  },
  slate: {
    label: 'Slate',
    accent: 'slate',
    preview: 'bg-slate-600',
    classes: {
      bg: 'bg-slate-50',
      button: 'bg-slate-700 hover:bg-slate-800',
      badge: 'bg-slate-100 text-slate-800',
      border: 'border-slate-200',
      text: 'text-slate-700',
      icon: 'text-slate-600',
      ring: 'ring-slate-500',
    },
  },
  rose: {
    label: 'Rose',
    accent: 'rose',
    preview: 'bg-rose-500',
    classes: {
      bg: 'bg-rose-50',
      button: 'bg-rose-600 hover:bg-rose-700',
      badge: 'bg-rose-100 text-rose-800',
      border: 'border-rose-200',
      text: 'text-rose-700',
      icon: 'text-rose-600',
      ring: 'ring-rose-500',
    },
  },
  amber: {
    label: 'Amber',
    accent: 'amber',
    preview: 'bg-amber-500',
    classes: {
      bg: 'bg-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700',
      badge: 'bg-amber-100 text-amber-800',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      ring: 'ring-amber-500',
    },
  },
};

const ClubThemeContext = createContext({ theme: 'emerald', themeClasses: CLUB_THEMES.emerald.classes });

export function ClubThemeProvider({ children, theme = 'emerald' }) {
  const resolved = CLUB_THEMES[theme] || CLUB_THEMES.emerald;
  return (
    <ClubThemeContext.Provider value={{ theme, themeClasses: resolved.classes }}>
      {children}
    </ClubThemeContext.Provider>
  );
}

export function useClubTheme() {
  return useContext(ClubThemeContext);
}