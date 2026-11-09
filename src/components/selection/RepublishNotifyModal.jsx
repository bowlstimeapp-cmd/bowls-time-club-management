import React from 'react';
import { Users, UserPlus, Loader2 } from 'lucide-react';

/**
 * Asks the selector who should be notified when a published selection is republished.
 * onChoose('all' | 'changed')
 */
export default function RepublishNotifyModal({ open, onClose, onChoose, isSaving }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Republish Selection</h2>
        <p className="text-sm text-gray-500 mb-4">
          Who should be notified about this update? Selected players receive a push notification, an in-app alert and an email.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onChoose('all')}
            className="w-full text-left rounded-xl border border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors disabled:opacity-50">
            
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Users className="w-4 h-4 text-emerald-600" />
              All participants
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Everyone on the team sheet and every reserve is notified again.
            </p>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onChoose('changed')}
            className="w-full text-left rounded-xl border border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors disabled:opacity-50">
            
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Changed participants only
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Only players and reserves added or changed since the last publication.
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Cancel
        </button>
      </div>
    </div>);

}