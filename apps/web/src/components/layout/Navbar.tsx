import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Bike,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { webNotificationService } from '../../services/notification.service';
import { socketService } from '../../services/socket.service';
import { NotificationDto } from '@food-delivery/shared';

export interface NavbarProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const LiveClock: React.FC = React.memo(() => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
      🕒 {time}
    </span>
  );
});

export const Navbar: React.FC<NavbarProps> = ({ title, onRefresh, isRefreshing = false }) => {
  const { restaurant } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count & recent notifications (pushed real-time via Socket.IO below)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: () => webNotificationService.getUnreadCount(),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => webNotificationService.getNotifications(1, 10),
    enabled: showNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: () => webNotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: (id: string) => webNotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Listen for real-time notifications over Socket.IO
  useEffect(() => {
    const socket = socketService.connect();

    const handleNewNotification = (notif: NotificationDto) => {
      console.log('⚡ Real-time notification received:', notif.title);
      webNotificationService.showBrowserNotification(notif.title, notif.body);
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      // Auto-prompt browser notification permission if not yet decided
      await webNotificationService.requestBrowserPermission();
    }
  };

  const notifications = notificationsData?.items || [];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-20 transition-colors">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Clock (isolated from Navbar renders) */}
        <LiveClock />

        {/* Store Active Status Pill */}
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{restaurant?.isActive ? 'Kitchen Active & Open' : 'Store Offline'}</span>
        </div>

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          <span className="text-xs font-semibold hidden md:inline text-gray-700 dark:text-slate-200">
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Audio Alert Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute Order Audio Alerts' : 'Unmute Order Audio Alerts'}
          className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            soundEnabled
              ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-900 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60'
              : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleNotifications}
            className={`p-2 rounded-xl border transition-colors relative ${
              showNotifications
                ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-brand-50 text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markSingleMutation.mutate(n.id)}
                      className={`p-3 transition-colors cursor-pointer flex gap-3 ${
                        n.isRead ? 'bg-white hover:bg-gray-50/60' : 'bg-brand-50/30 hover:bg-brand-50/60'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            n.isRead
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-brand-100 text-brand-600'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${n.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
