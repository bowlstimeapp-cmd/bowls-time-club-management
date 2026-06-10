import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAccessibility, PRESETS } from '@/lib/AccessibilityContext';
import { Eye } from 'lucide-react';

const PRESET_DETAILS = {
  standard: {
    features: ['Default text size', 'Standard controls', 'Normal contrast'],
    color: 'border-gray-200 bg-white',
    selectedColor: 'border-emerald-500 bg-emerald-50',
    badge: null,
  },
  senior: {
    features: ['Larger text (18px+)', 'Bigger buttons & inputs', 'High contrast colours', 'Extra spacing', 'Stronger focus outlines'],
    color: 'border-gray-200 bg-white',
    selectedColor: 'border-emerald-600 bg-emerald-50',
    badge: { label: 'Recommended', color: 'bg-emerald-100 text-emerald-800' },
  },
  maximum: {
    features: ['Very large text (22px+)', 'Maximum contrast (black/white)', 'Largest touch targets', 'Bold borders on all elements', 'Highest visibility focus rings'],
    color: 'border-gray-200 bg-white',
    selectedColor: 'border-slate-900 bg-slate-50',
    badge: { label: 'Highest Contrast', color: 'bg-slate-100 text-slate-800' },
  },
};

export default function AccessibilitySettingsCard() {
  const { preset, setPreset } = useAccessibility();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-emerald-600" />
          Display &amp; Accessibility
        </CardTitle>
        <CardDescription>
          Choose how the app looks and feels. Senior Friendly and Maximum Accessibility modes make text larger, controls bigger, and colours easier to see.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(PRESETS).map(([key, info]) => {
          const details = PRESET_DETAILS[key];
          const isSelected = preset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`w-full text-left border-2 rounded-xl p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                isSelected ? details.selectedColor + ' ring-2 ring-offset-1 ' + (key === 'maximum' ? 'ring-slate-900' : 'ring-emerald-500') : details.color + ' hover:border-gray-300'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{info.label}</p>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isSelected && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      Active
                    </span>
                  )}
                  {details.badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${details.badge.color}`}>
                      {details.badge.label}
                    </span>
                  )}
                </div>
              </div>
              <ul className="flex flex-wrap gap-1.5 mt-2">
                {details.features.map(f => (
                  <li key={f} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}

        <p className="text-xs text-gray-500 pt-1">
          Your preference is saved automatically and will be remembered next time you visit.
        </p>
      </CardContent>
    </Card>
  );
}