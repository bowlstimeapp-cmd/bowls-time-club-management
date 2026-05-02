import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { format } from 'date-fns';

export default function SmsNotificationControl({ clubId, enabled, onChange }) {
  const monthKey = format(new Date(), 'yyyy-MM');

  const { data: usageRecord } = useQuery({
    queryKey: ['smsUsage', clubId, monthKey],
    queryFn: async () => {
      const records = await base44.entities.SmsUsage.filter({ club_id: clubId, month_key: monthKey });
      return records[0] || null;
    },
    enabled: !!clubId,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const allowance = club?.sms_monthly_allowance ?? null;
  const sentCount = usageRecord?.sent_count || 0;
  const isExceeded = allowance != null && sentCount >= allowance;
  const percentage = allowance != null && allowance > 0 ? Math.min(100, Math.round((sentCount / allowance) * 100)) : 0;

  // Force unchecked if exceeded
  const effectiveEnabled = isExceeded ? false : enabled;

  return (
    <div className="space-y-2 pt-3 border-t">
      <div className="flex items-center gap-2">
        <Checkbox
          id="sms-notification"
          checked={effectiveEnabled}
          disabled={isExceeded}
          onCheckedChange={(checked) => !isExceeded && onChange(!!checked)}
        />
        <Label
          htmlFor="sms-notification"
          className={`cursor-pointer font-normal ${isExceeded ? 'text-gray-400' : ''}`}
        >
          Send SMS Notification
        </Label>
      </div>

      {allowance != null && (
        <div className="pl-6 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{sentCount} sent of {allowance} allowance</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all rounded-full ${percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          {isExceeded && (
            <p className="text-xs text-red-600 font-medium">
              Monthly SMS allowance has been exceeded and will refresh next calendar month.
            </p>
          )}
        </div>
      )}
    </div>
  );
}