import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

export default function ImportValidationReport({ errors = [], warnings = [] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        The bundle passed every check and is ready to import.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <XCircle className="w-4 h-4" />
            {errors.length} blocking {errors.length === 1 ? 'problem' : 'problems'} — nothing will be imported
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc pl-5">
            {errors.slice(0, 40).map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'} — the import can continue
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc pl-5">
            {warnings.slice(0, 40).map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}