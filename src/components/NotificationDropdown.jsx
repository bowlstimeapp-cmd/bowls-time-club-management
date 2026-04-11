import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function NotificationDropdown({ userEmail, clubId }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: userEmail 
    }, '-created_date', 50),
    enabled: !!userEmail,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (ids) => Promise.all(
      ids.map(id => base44.entities.Notification.update(id, { is_read: true }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] });
    },
  });

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const recentNotifications = notifications.slice(0, 5);

  const handleOpen = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && unreadNotifications.length > 0) {
      // Mark all as read when opening
      const unreadIds = unreadNotifications.map(n => n.id);
      markAsReadMutation.mutate(unreadIds);
    }
  };

  const handleNotificationClick = (notification) => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadNotifications.length > 0 && (
            <p className="text-sm text-gray-500">{unreadNotifications.length} unread</p>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {recentNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const link = notification.link_page 
                  ? `${createPageUrl(notification.link_page)}${notification.link_params || ''}` 
                  : null;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {link ? (
                      <Link
                        to={link}
                        onClick={() => handleNotificationClick(notification)}
                        className={`block p-4 border-b hover:bg-gray-50 transition-colors ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <NotificationContent notification={notification} Icon={Icon} />
                      </Link>
                    ) : (
                      <div className={`p-4 border-b ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                        <NotificationContent notification={notification} Icon={Icon} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Link
              to={createPageUrl('Notifications') + (clubId ? `?clubId=${clubId}` : '')}
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              See all notifications
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationContent({ notification, Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{notification.title}</p>
        <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {format(parseISO(notification.created_date), 'MMM d, HH:mm')}
        </p>
      </div>
    </div>
  );
}