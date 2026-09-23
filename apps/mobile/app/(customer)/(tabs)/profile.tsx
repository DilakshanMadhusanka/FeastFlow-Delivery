import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { mobileNotificationService } from '../../../services/notification.service';
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Heart,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Bike,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: () => mobileNotificationService.getUnreadCount(),
    enabled: Boolean(user),
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.guestIcon}>
          <UserIcon size={44} color="#FF4B3A" />
        </View>
        <Text style={styles.guestTitle}>Your Profile</Text>
        <Text style={styles.guestSubtitle}>
          Sign in or create an account to view your saved addresses, payment methods, and profile settings.
        </Text>
        <Button
          title="Sign In / Register"
          onPress={() => router.push('/(auth)/login')}
          style={styles.signInButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <Image
            source={{
              uri:
                user.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color="#166534" />
              <Text style={styles.roleText}>{user.roles.join(', ')}</Text>
            </View>
          </View>
        </View>

        {/* Courier Partner Mode Launcher */}
        <TouchableOpacity
          style={styles.driverCard}
          activeOpacity={0.88}
          onPress={() => router.push('/(driver)/dashboard' as any)}
        >
          <View style={styles.driverCardLeft}>
            <View style={styles.driverIconBox}>
              <Bike size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverCardTitle}>Courier Partner Terminal</Text>
              <Text style={styles.driverCardSub}>Deliver orders, view radar & earn payouts</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <MapPin size={20} color="#FF4B3A" />
              <Text style={styles.menuItemText}>Delivery Addresses</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <CreditCard size={20} color="#3B82F6" />
              <Text style={styles.menuItemText}>Payment Methods</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <Heart size={20} color="#EC4899" />
              <Text style={styles.menuItemText}>Favorite Restaurants</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(customer)/notifications' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Bell size={20} color="#F59E0B" />
              <Text style={styles.menuItemText}>Notifications Inbox</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {unreadNotifCount > 0 && (
                <View
                  style={{
                    backgroundColor: '#FF4B3A',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {unreadNotifCount}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <Button
          title="Log Out"
          variant="outline"
          leftIcon={<LogOut size={18} color="#FF4B3A" />}
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  signInButton: {
    width: '100%',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  driverCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  driverCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  driverIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FF4B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  driverCardSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  logoutButton: {
    marginTop: 8,
  },
});
