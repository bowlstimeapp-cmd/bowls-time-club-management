import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle, XCircle, Users, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const notificationIcons = {
  booking_accepted: CheckCircle,
  booking_rejected: XCircle,
  booking_moved: Calendar,
  team_selection: Users,
};

export default function Notifications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['allNotifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: user.email 
    }, '-created_date', 100),
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">View all your notifications</p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You don't have any notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const link = notification.link_page 
                ? `${createPageUrl(notification.link_page)}${notification.link_params || ''}` 
                : null;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {link ? (
                    <Link to={link}>
                      <Card className={`hover:shadow-md transition-shadow ${
                        !notification.is_read ? 'border-emerald-200 bg-emerald-50' : ''
                      }`}>
                        <CardContent className="p-4">
                          <NotificationContent notification={notification} Icon={Icon} />
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Card className={!notification.is_read ? 'border-emerald-200 bg-emerald-50' : ''}>
                      <CardContent className="p-4">
                        <NotificationContent notification={notification} Icon={Icon} />
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationContent({ notification, Icon }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-emerald-100">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900">{notification.title}</p>
          {!notification.is_read && (
            <Badge className="bg-emerald-600 text-white shrink-0">New</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-2">
          {format(parseISO(notification.created_date), 'MMMM d, yyyy • HH:mm')}
        </p>
      </div>
    </div>
  );
}