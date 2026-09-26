import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { mobileNotificationService } from '../../../services/notification.service';
import { useTheme } from '../../../theme/useTheme';
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
  Sun,
  Moon,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();

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
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.guestIcon, { backgroundColor: colors.brandLight }]}>
          <UserIcon size={44} color={colors.brand} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.text }]}>Your Profile</Text>
        <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Image
            source={{
              uri:
                user.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
            {user.phone ? <Text style={[styles.userPhone, { color: colors.textMuted }]}>{user.phone}</Text> : null}
            <View style={[styles.roleBadge, isDark && { backgroundColor: '#064E3B' }]}>
              <ShieldCheck size={12} color={isDark ? '#34D399' : '#166534'} />
              <Text style={[styles.roleText, isDark && { color: '#34D399' }]}>{user.roles.join(', ')}</Text>
            </View>
          </View>
        </View>

        {/* Courier Partner Mode Launcher */}
        <TouchableOpacity
          style={[styles.driverCard, isDark && { backgroundColor: '#1E293B', borderColor: colors.border, borderWidth: 1 }]}
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
        <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {/* Appearance / Dark Mode Toggle */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderLight, justifyContent: 'space-between' }]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#312E81' : '#FEF3C7' }]}>
                {isDark ? <Moon size={18} color="#A5B4FC" /> : <Sun size={18} color="#D97706" />}
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Dark Mode</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => toggleTheme()}
              trackColor={{ false: '#D1D5DB', true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#450A0A' : '#FFF1F0' }]}>
                <MapPin size={18} color="#FF4B3A" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Delivery Addresses</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#172554' : '#EFF6FF' }]}>
                <CreditCard size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Payment Methods</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#500724' : '#FDF2F8' }]}>
                <Heart size={18} color="#EC4899" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Favorite Restaurants</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => router.push('/(customer)/notifications' as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? '#451A03' : '#FFFBEB' }]}>
                <Bell size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications Inbox</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {unreadNotifCount > 0 && (
                <View
                  style={{
                    backgroundColor: colors.brand,
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
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <Button
          title="Log Out"
          variant="outline"
          leftIcon={<LogOut size={18} color={colors.brand} />}
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
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    marginTop: 8,
  },
});

