import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShieldAlert, ArrowLeft, Search, Calendar, Clock, User, 
  MapPin, CheckCircle, XCircle, ArrowRightLeft, Trash2, Pencil, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const actionConfig = {
  approved:  { label: 'Approved',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-800 border-red-300',             icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700 border-gray-300',          icon: XCircle },
  deleted:   { label: 'Deleted',   color: 'bg-red-100 text-red-800 border-red-300',             icon: Trash2 },
  moved:     { label: 'Moved',     color: 'bg-blue-100 text-blue-800 border-blue-300',          icon: ArrowRightLeft },
  swapped:   { label: 'Swapped',   color: 'bg-purple-100 text-purple-800 border-purple-300',    icon: ArrowRightLeft },
  edited:    { label: 'Edited',    color: 'bg-amber-100 text-amber-800 border-amber-300',       icon: Pencil },
};

export default function BookingsAudit() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!clubId) navigate(createPageUrl('ClubSelector'));
  }, [clubId, navigate]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['bookingAuditLogs', clubId],
    queryFn: () => base44.entities.BookingAuditLog.filter({ club_id: clubId }, '-created_date', 200),
    enabled: !!clubId,
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';

  if (!membershipLoading && user && !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only club admins can view the bookings audit log.</p>
          <Link to={createPageUrl('AdminBookings') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Back to Booking Management</Button>
          </Link>
        </div>
      </div>
    );
  }

  const filtered = auditLogs.filter(log => {
    const q = searchQuery.toLowerCase();
    return (
      log.booker_name?.toLowerCase().includes(q) ||
      log.booker_email?.toLowerCase().includes(q) ||
      log.performed_by_name?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            to={createPageUrl('AdminBookings') + `?clubId=${clubId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Booking Management
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Bookings Audit Log</h1>
          <p className="text-gray-600">{club?.name} • A record of all admin and steward actions on bookings</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by booker, action or performed by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No audit records found</h3>
              <p className="text-gray-500 text-sm">Admin and steward booking actions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => {
                const config = actionConfig[log.action] || actionConfig.edited;
                const ActionIcon = config.icon;
                return (
                  <Card key={log.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        {/* Left: booking details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={config.color + ' border'}>
                              <ActionIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            {log.performed_by_role && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {log.performed_by_role}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            {log.booker_name && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-medium">{log.booker_name}</span>
                              </div>
                            )}
                            {log.booking_rink && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>Rink {log.booking_rink}</span>
                              </div>
                            )}
                            {log.booking_date && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{format(parseISO(log.booking_date), 'd MMM yyyy')}</span>
                              </div>
                            )}
                            {log.booking_start_time && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{log.booking_start_time} – {log.booking_end_time}</span>
                              </div>
                            )}
                          </div>

                          {log.competition_type && (
                            <p className="text-xs text-gray-500">{log.competition_type}</p>
                          )}

                          {log.details && (
                            <p className="text-xs text-gray-500 italic">{log.details}</p>
                          )}
                        </div>

                        {/* Right: who did it & when */}
                        <div className="sm:text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-800">{log.performed_by_name}</p>
                          <p className="text-xs text-gray-500">{log.performed_by_email}</p>
                          {log.created_date && (
                            <p className="text-xs text-gray-400 mt-1">
                              {format(parseISO(log.created_date), 'd MMM yyyy, HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}