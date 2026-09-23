import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileNotificationService } from '../../services/notification.service';
import { mobileSocketService } from '../../services/socket.service';
import { Loading } from '../../components/ui/Loading';
import { NotificationDto, NotificationType } from '@food-delivery/shared';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Clock,
  Utensils,
  Bike,
  Package,
  AlertCircle,
  Tag,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => mobileNotificationService.getNotifications(1, 50),
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: () => mobileNotificationService.getUnreadCount(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => mobileNotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => mobileNotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mobileNotificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  // Subscribe to real-time notification pushes over Socket.IO
  useEffect(() => {
    let isMounted = true;
    mobileSocketService.connect();

    // Set up native push token registration
    mobileNotificationService.initializePushNotifications();

    const socket = (mobileSocketService as any).socket;
    if (socket) {
      const handleNewNotification = (notif: NotificationDto) => {
        if (!isMounted) return;
        queryClient.setQueryData(['notifications'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: [notif, ...(old.items || [])],
            total: (old.total || 0) + 1,
          };
        });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        isMounted = false;
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, [queryClient]);

  const handleNotificationPress = (notif: NotificationDto) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }

    // Deep link to order tracking if orderId is attached
    if (notif.data?.orderId) {
      router.push(`/(customer)/order-tracking/${notif.data.orderId}`);
    }
  };

  const getNotificationIcon = (type: NotificationType, title: string) => {
    if (title.toLowerCase().includes('courier') || title.toLowerCase().includes('way')) {
      return <Bike size={18} color="#FF4B3A" />;
    }
    if (title.toLowerCase().includes('cooking') || title.toLowerCase().includes('kitchen')) {
      return <Utensils size={18} color="#EA580C" />;
    }
    if (type === NotificationType.DELIVERY_ALERT) {
      return <Package size={18} color="#2563EB" />;
    }
    if (type === NotificationType.PROMOTION) {
      return <Tag size={18} color="#16A34A" />;
    }
    return <Bell size={18} color="#FF4B3A" />;
  };

  const formatTimestamp = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading notifications..." />;
  }

  const notifications = notificationsData?.items || [];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => markAllReadMutation.mutate()}
            style={styles.markAllBtn}
          >
            <CheckCheck size={16} color="#FF4B3A" />
            <Text style={styles.markAllText}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#FF4B3A']}
            tintColor="#FF4B3A"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bell size={36} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>
              You have no notifications at the moment. Order updates and alerts will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleNotificationPress(item)}
            style={[
              styles.notificationCard,
              !item.isRead && styles.unreadNotificationCard,
            ]}
          >
            <View style={styles.iconCircle}>
              {getNotificationIcon(item.type, item.title)}
            </View>

            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.notificationTitle,
                    !item.isRead && styles.unreadTitleText,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={styles.timeText}>{formatTimestamp(item.createdAt)}</Text>
              </View>

              <Text style={styles.notificationBody} numberOfLines={2}>
                {item.body}
              </Text>
            </View>

            <View style={styles.rightActionCol}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  unreadCountBadge: {
    backgroundColor: '#FF4B3A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadNotificationCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadTitleText: {
    fontWeight: '800',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  notificationBody: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  rightActionCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 8,
    gap: 12,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF4B3A',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
});
