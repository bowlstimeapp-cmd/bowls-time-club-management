import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

export default function SmsUsageTab({ clubs }) {
  const [clubFilter, setClubFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const { data: usageRecords = [], isLoading } = useQuery({
    queryKey: ['allSmsUsage'],
    queryFn: () => base44.entities.SmsUsage.list('-month_key', 500),
  });

  const filteredRecords = usageRecords.filter(r => {
    const clubName = clubs.find(c => c.id === r.club_id)?.name || r.club_name || '';
    if (clubFilter && !clubName.toLowerCase().includes(clubFilter.toLowerCase())) return false;
    if (monthFilter && !r.month_key?.includes(monthFilter)) return false;
    return true;
  });

  // Enrich with latest club name
  const enriched = filteredRecords.map(r => ({
    ...r,
    resolvedClubName: clubs.find(c => c.id === r.club_id)?.name || r.club_name || r.club_id,
    resolvedAllowance: clubs.find(c => c.id === r.club_id)?.sms_monthly_allowance ?? r.allowance ?? null,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            SMS Usage Report
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Filter by club..."
              value={clubFilter}
              onChange={e => setClubFilter(e.target.value)}
              className="w-44"
            />
            <Input
              placeholder="Filter by month (YYYY-MM)..."
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="w-52"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : enriched.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No SMS usage data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Club</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Month</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">SMS Sent</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Allowance</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">% Used</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(record => {
                  const pct = record.resolvedAllowance != null && record.resolvedAllowance > 0
                    ? Math.round((record.sent_count / record.resolvedAllowance) * 100)
                    : null;
                  const isOver = pct != null && pct >= 100;
                  return (
                    <tr key={record.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{record.resolvedClubName}</td>
                      <td className="py-2 px-3 text-gray-600">{record.month_key}</td>
                      <td className="py-2 px-3 text-right">{record.sent_count}</td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {record.resolvedAllowance != null ? record.resolvedAllowance : <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${isOver ? 'text-red-600' : pct != null && pct >= 80 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {pct != null ? `${pct}%` : <span className="text-gray-400">N/A</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">Showing up to 500 most recent records, ordered by month descending.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}