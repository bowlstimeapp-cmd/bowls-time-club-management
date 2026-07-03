import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function TodaySummary({ clubId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['secretaryTodayBookings', clubId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTodayBookings', { club_id: clubId });
      return res.data;
    },
    enabled: !!clubId,
  });

  const bookings = data?.bookings || [];
  const approvedCount = bookings.filter(b => b.status === 'approved').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Today's Summary
        </CardTitle>
        <div className="flex gap-2 mt-1">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{approvedCount} confirmed</Badge>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{pendingCount} pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">No rink bookings for today.</div>
        ) : (
          <div className="divide-y">
            {bookings.map(booking => (
              <div key={booking.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900">Rink {booking.rink_number}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.start_time} – {booking.end_time}</span>
                    <span>{booking.booker_name}</span>
                    {booking.competition_type && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.competition_type === 'Other' ? (booking.competition_other || 'Other') : booking.competition_type}</span>
                    )}
                  </div>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingStatusBadge({ status }) {
  if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Confirmed</Badge>;
  if (status === 'pending') return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}