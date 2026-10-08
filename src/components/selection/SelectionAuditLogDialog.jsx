import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { History, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CHANGE_STYLES = {
  added: 'bg-emerald-100 text-emerald-700',
  removed: 'bg-red-100 text-red-700',
  replaced: 'bg-amber-100 text-amber-700',
};

export default function SelectionAuditLogDialog({ open, onOpenChange, clubId }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke('getSelectionAuditLog', { clubId });
      setEntries(res?.data?.entries || []);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, clubId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Selection Audit Log
          </DialogTitle>
        </DialogHeader>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="self-start">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading && !entries ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading audit log…</p>
          ) : error ? (
            <p className="text-sm text-red-600 py-6 text-center">Could not load the audit log. Please try again.</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No selection changes recorded yet.</p>
          ) : (
            <div className="space-y-2 py-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                  <Badge className={`shrink-0 capitalize ${CHANGE_STYLES[e.change] || 'bg-gray-100 text-gray-700'}`}>
                    {e.change}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">
                      {e.member_name || e.member_email || e.previous_member_email}
                      {' '}
                      <span className="font-normal text-gray-500">at</span>
                      {' '}
                      <span className="font-mono text-xs">{(e.position || '').replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {e.competition}
                      {e.match_name ? ` - ${e.match_name}` : ''}
                      {e.match_date ? ` • ${format(new Date(e.match_date), 'd MMM yyyy')}` : ''}
                      {' • by '}
                      {e.performed_by_name || e.performed_by_email}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(e.created_date), 'd MMM yyyy, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}