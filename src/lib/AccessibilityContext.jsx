/**
 * Accessibility / Display Preset Context
 *
 * Three presets:
 *   standard   – default app appearance, no overrides
 *   senior     – Senior Friendly: larger text, bigger targets, high-contrast palette
 *   maximum    – Maximum Accessibility: very large text, maximum contrast, simplified
 *
 * The chosen preset is stored in localStorage under 'bt_accessibility_preset'.
 * When a senior/maximum preset is active, a <style> block is injected into
 * <head> that overrides CSS custom properties and adds utility classes used
 * throughout the app.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'bt_accessibility_preset';

export const PRESETS = {
  standard: {
    label: 'Standard',
    description: 'Default app appearance',
    icon: '🖥️',
  },
  senior: {
    label: 'Senior Friendly',
    description: 'Larger text, bigger controls, high contrast',
    icon: '👓',
  },
  maximum: {
    label: 'Maximum Accessibility',
    description: 'Very large text, highest contrast, simplified layout',
    icon: '♿',
  },
};

// ── CSS injected per preset ────────────────────────────────────────────────

const SENIOR_CSS = `
/* ===== SENIOR FRIENDLY PRESET ===== */
:root {
  --sf-bg:          #FAFAF7;
  --sf-primary:     #1F5E3B;
  --sf-primary-fg:  #ffffff;
  --sf-secondary:   #1F3C5A;
  --sf-accent:      #C8A24A;
  --sf-text:        #222222;
  --sf-muted:       #444444;
  --sf-border:      #9ca3af;
  --sf-success:     #1F5E3B;
  --sf-warning:     #92400e;
  --sf-error:       #991b1b;
  --sf-card-bg:     #ffffff;
  --sf-row-alt:     #F0F4F0;
}

/* Body */
body { font-size: 18px !important; line-height: 1.6 !important; background: var(--sf-bg) !important; color: var(--sf-text) !important; }

/* Headings */
h1, .sf-h1 { font-size: 2rem !important; font-weight: 700 !important; color: var(--sf-text) !important; }
h2, .sf-h2 { font-size: 1.6rem !important; font-weight: 700 !important; color: var(--sf-text) !important; }
h3, .sf-h3 { font-size: 1.35rem !important; font-weight: 600 !important; color: var(--sf-text) !important; }

/* Muted / subdued text — always dark enough */
.text-gray-400, .text-gray-500, .text-muted-foreground {
  color: var(--sf-muted) !important;
}

/* Cards */
.card, [class*="bg-white"], [class*="bg-card"] {
  background: var(--sf-card-bg) !important;
}

/* Buttons — minimum 48px touch target */
button, [role="button"], .btn, a[class*="Button"] {
  min-height: 48px !important;
  min-width: 48px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}

/* Emerald / primary buttons */
.bg-emerald-600, .bg-emerald-700 {
  background-color: var(--sf-primary) !important;
}
.hover\\:bg-emerald-700:hover { background-color: #174d30 !important; }

/* Inputs */
input, select, textarea {
  font-size: 1rem !important;
  min-height: 48px !important;
  padding: 0.6rem 0.875rem !important;
  border: 2px solid var(--sf-border) !important;
  color: var(--sf-text) !important;
  background: #ffffff !important;
}
input:focus, select:focus, textarea:focus {
  outline: 3px solid var(--sf-primary) !important;
  outline-offset: 2px !important;
  border-color: var(--sf-primary) !important;
}

/* Labels */
label { font-size: 1rem !important; font-weight: 600 !important; color: var(--sf-text) !important; margin-bottom: 0.35rem !important; display: block !important; }

/* Nav items */
nav a, nav button, header a, header button {
  font-size: 1rem !important;
  min-height: 48px !important;
}

/* Badges */
.badge, [class*="Badge"] { font-size: 0.9rem !important; padding: 0.3rem 0.7rem !important; font-weight: 600 !important; }

/* Table */
table { font-size: 1rem !important; }
th { font-size: 1rem !important; font-weight: 700 !important; color: var(--sf-text) !important; padding: 0.8rem 1rem !important; }
td { padding: 0.8rem 1rem !important; color: var(--sf-text) !important; }
tr:nth-child(even) td { background: var(--sf-row-alt) !important; }

/* Focus ring */
*:focus-visible {
  outline: 3px solid var(--sf-primary) !important;
  outline-offset: 3px !important;
}

/* Spacing helpers */
.space-y-4 > * + * { margin-top: 1.25rem !important; }
.space-y-6 > * + * { margin-top: 1.75rem !important; }

/* Links */
a { color: var(--sf-secondary) !important; text-decoration: underline !important; font-weight: 600 !important; }
a:hover { color: var(--sf-primary) !important; }

/* Reduce opacity animations for reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

const MAXIMUM_CSS = `
/* ===== MAXIMUM ACCESSIBILITY PRESET ===== */
:root {
  --sf-bg:          #FFFFFF;
  --sf-primary:     #003320;
  --sf-primary-fg:  #ffffff;
  --sf-secondary:   #00264d;
  --sf-accent:      #7a5a00;
  --sf-text:        #000000;
  --sf-muted:       #333333;
  --sf-border:      #000000;
  --sf-success:     #003320;
  --sf-warning:     #7a3a00;
  --sf-error:       #7a0000;
  --sf-card-bg:     #ffffff;
  --sf-row-alt:     #E8EFE8;
}

/* Body */
body { font-size: 22px !important; line-height: 1.75 !important; background: #ffffff !important; color: #000000 !important; }

/* Headings */
h1, .sf-h1 { font-size: 2.5rem !important; font-weight: 800 !important; color: #000000 !important; }
h2, .sf-h2 { font-size: 2rem !important; font-weight: 800 !important; color: #000000 !important; }
h3, .sf-h3 { font-size: 1.6rem !important; font-weight: 700 !important; color: #000000 !important; }

/* All text must be near-black */
p, span, div, li, td, th, label {
  color: #000000 !important;
}
.text-gray-400, .text-gray-500, .text-gray-600, .text-muted-foreground {
  color: #333333 !important;
}

/* Cards */
.card, [class*="bg-white"], [class*="bg-card"] {
  background: #ffffff !important;
  border: 2px solid #000000 !important;
}

/* Buttons */
button, [role="button"], .btn {
  min-height: 56px !important;
  min-width: 56px !important;
  font-size: 1.2rem !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
  border: 2px solid transparent !important;
}
button:not([class*="ghost"]):not([class*="outline"]) {
  background-color: var(--sf-primary) !important;
  color: #ffffff !important;
}
button[class*="outline"], button[class*="ghost"] {
  background: #ffffff !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
}
.bg-emerald-600, .bg-emerald-700 {
  background-color: var(--sf-primary) !important;
}

/* Inputs */
input, select, textarea {
  font-size: 1.2rem !important;
  min-height: 56px !important;
  padding: 0.75rem 1rem !important;
  border: 3px solid #000000 !important;
  color: #000000 !important;
  background: #ffffff !important;
}
input:focus, select:focus, textarea:focus {
  outline: 4px solid var(--sf-primary) !important;
  outline-offset: 2px !important;
}

/* Labels */
label { font-size: 1.1rem !important; font-weight: 700 !important; color: #000000 !important; margin-bottom: 0.5rem !important; display: block !important; }

/* Nav */
nav a, nav button, header a, header button {
  font-size: 1.1rem !important;
  min-height: 56px !important;
  font-weight: 700 !important;
}

/* Badges */
.badge, [class*="Badge"] {
  font-size: 1rem !important;
  padding: 0.4rem 0.9rem !important;
  font-weight: 700 !important;
  border: 2px solid currentColor !important;
}

/* Table */
table { font-size: 1.1rem !important; border-collapse: collapse !important; }
th { font-size: 1.1rem !important; font-weight: 800 !important; color: #000000 !important; padding: 1rem 1.25rem !important; background: #e8efe8 !important; border-bottom: 3px solid #000 !important; }
td { padding: 1rem 1.25rem !important; color: #000000 !important; border-bottom: 2px solid #cccccc !important; }
tr:nth-child(even) td { background: var(--sf-row-alt) !important; }

/* Focus */
*:focus-visible {
  outline: 4px solid var(--sf-primary) !important;
  outline-offset: 4px !important;
}

/* Links */
a { color: var(--sf-secondary) !important; text-decoration: underline !important; font-weight: 700 !important; text-decoration-thickness: 2px !important; }
a:hover { color: var(--sf-primary) !important; }

/* Spacing */
.space-y-4 > * + * { margin-top: 1.5rem !important; }
.space-y-6 > * + * { margin-top: 2rem !important; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

const STYLE_ID = 'bt-accessibility-styles';

function injectStyles(preset) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (preset === 'senior') el.textContent = SENIOR_CSS;
  else if (preset === 'maximum') el.textContent = MAXIMUM_CSS;
  else el.textContent = '';
}

// ── Context ────────────────────────────────────────────────────────────────

const AccessibilityContext = createContext({
  preset: 'standard',
  setPreset: () => {},
});

export function AccessibilityProvider({ children }) {
  const [preset, setPresetState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'standard';
  });

  const setPreset = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setPresetState(value);
    injectStyles(value);
    // Also set data-attr on <html> for CSS selectors if needed
    document.documentElement.setAttribute('data-accessibility', value);
  };

  // Inject on mount (persisted value)
  useEffect(() => {
    injectStyles(preset);
    document.documentElement.setAttribute('data-accessibility', preset);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ preset, setPreset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}