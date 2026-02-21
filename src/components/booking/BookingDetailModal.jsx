import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Trophy, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusIcons = {
  approved: CheckCircle,
  pending: Loader2,
  rejected: XCircle,
  cancelled: XCircle,
};

const statusColors = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

export default function BookingDetailModal({ booking, open, onClose }) {
  if (!booking) return null;

  const StatusIcon = statusIcons[booking.status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <Badge className={statusColors[booking.status]}>
              <StatusIcon className={`w-3 h-3 mr-1 ${booking.status === 'pending' ? 'animate-spin' : ''}`} />
              <span className="capitalize">{booking.status}</span>
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium">{format(parseISO(booking.date), 'EEEE, d MMMM yyyy')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium">{booking.start_time} - {booking.end_time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Booked By</p>
                <p className="text-sm font-medium">{booking.booker_name}</p>
                <p className="text-xs text-gray-500">{booking.booker_email}</p>
              </div>
            </div>

            {booking.competition_type && (
              <div className="flex items-start gap-3">
                <Trophy className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Competition Type</p>
                  <p className="text-sm font-medium">
                    {booking.competition_type === 'Other' && booking.competition_other
                      ? booking.competition_other
                      : booking.competition_type}
                  </p>
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm">{booking.notes}</p>
                </div>
              </div>
            )}

            {booking.admin_notes && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Admin Notes</p>
                  <p className="text-sm">{booking.admin_notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">Rink Number</p>
            <p className="text-2xl font-bold text-emerald-600">Rink {booking.rink_number}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}