import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare,
  Trophy,
  Pencil
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { 
    label: 'Pending Approval', 
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Loader2,
    iconClass: 'animate-spin'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    iconClass: ''
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    iconClass: ''
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: XCircle,
    iconClass: ''
  },
};

export default function BookingCard({ 
  booking, 
  onCancel, 
  onApprove, 
  onReject,
  onEdit,
  onDelete,
  isAdmin = false,
  isOwn = false,
  isLoading = false 
}) {
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;

  const formatTime = (time) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    return hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        booking.status === 'cancelled' && "opacity-60"
      )}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Left accent */}
            <div className={cn(
              "w-full sm:w-2 h-2 sm:h-auto",
              booking.status === 'approved' && "bg-emerald-500",
              booking.status === 'pending' && "bg-amber-400",
              booking.status === 'rejected' && "bg-red-400",
              booking.status === 'cancelled' && "bg-gray-300"
            )} />

            <div className="flex-1 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("border", status.color)}>
                      <StatusIcon className={cn("w-3 h-3 mr-1", status.iconClass)} />
                      {status.label}
                    </Badge>
                    {isOwn && (
                      <Badge variant="outline" className="text-xs">Your Booking</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Rink {booking.rink_number}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {format(parseISO(booking.date), 'd MMM yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </span>
                    {booking.competition_type && (
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-emerald-600" />
                        {booking.competition_type === 'Other' ? booking.competition_other : booking.competition_type}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Booked by:</span> {booking.booker_name} ({booking.booker_email})
                    </p>
                  )}

                  {booking.notes && (
                    <p className="text-sm text-gray-500 flex items-start gap-1.5">
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {booking.notes}
                    </p>
                  )}

                  {booking.admin_notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                      <span className="font-medium">Admin note:</span> {booking.admin_notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap shrink-0">
                  {isAdmin && booking.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onApprove(booking)}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject(booking)}
                        disabled={isLoading}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Reject</span>
                      </Button>
                    </>
                  )}
                  
                  {isAdmin && onEdit && (booking.status === 'approved' || booking.status === 'pending') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(booking)}
                      disabled={isLoading}
                    >
                      <Pencil className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  )}
                  
                  {isAdmin && onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(booking)}
                      disabled={isLoading}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  )}
                  
                  {isOwn && (booking.status === 'pending' || booking.status === 'approved') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel(booking)}
                      disabled={isLoading}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Cancel</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}