import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, Utensils, ArrowLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (emailToUse = email, passwordToUse = password) => {
    const cleanEmail = (emailToUse || '').trim();
    const cleanPassword = (passwordToUse || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(cleanEmail, cleanPassword);
      const user = useAuthStore.getState().user;
      if (user?.roles?.includes('DELIVERY_DRIVER' as any)) {
        router.replace('/(driver)/dashboard');
      } else {
        router.replace('/(customer)/(tabs)/home');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid credentials. Please check your email and password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    handleLogin(demoEmail, 'Password@123');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Navigation */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(customer)/(tabs)/home')}
        >
          <ArrowLeft size={20} color="#374151" />
          <Text style={styles.backText}>Skip to Browse</Text>
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Utensils size={32} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to track orders and save your favorites</Text>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <Input
          label="Email Address"
          placeholder="e.g. john.doe@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Mail size={20} color="#9CA3AF" />}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          leftIcon={<Lock size={20} color="#9CA3AF" />}
        />

        <Button
          title="Sign In"
          onPress={() => handleLogin()}
          isLoading={isLoading}
          style={styles.submitButton}
        />

        {/* Quick Demo Logins */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Sign In</Text>
          <View style={styles.demoGrid}>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => handleQuickFill('driver.mike@feastflow.com')}
            >
              <Text style={styles.demoChipText}>🛵 Delivery Courier (driver.mike@feastflow.com)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => handleQuickFill('john.doe@gmail.com')}
            >
              <Text style={styles.demoChipText}>👤 Customer (john.doe@gmail.com)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => handleQuickFill('bistro.owner@feastflow.com')}
            >
              <Text style={styles.demoChipText}>🍳 Restaurant Owner (bistro.owner@feastflow.com)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 24,
    paddingTop: 56,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF4B3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  demoSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  demoGrid: {
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4B3A',
  },
});
