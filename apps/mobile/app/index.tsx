import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Utensils } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(customer)/(tabs)/home');
      } else {
        router.replace('/(customer)/(tabs)/home'); // Allow guest browsing by default!
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.iconCircle}>
        <Utensils size={48} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>FeastFlow</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Delicious food delivered to your door</Text>
      <ActivityIndicator size="small" color="#FF4B3A" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FF4B3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 32,
  },
});
