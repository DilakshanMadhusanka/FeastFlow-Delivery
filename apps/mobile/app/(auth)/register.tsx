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
import { UserRole } from '@food-delivery/shared';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await register({
        name,
        email,
        password,
        phone: phone || undefined,
        role: selectedRole,
      });

      router.replace('/(customer)/(tabs)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardContainer, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Back Nav */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Sign In</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join FeastFlow and order from top local restaurants</Text>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Role Selector */}
        <Text style={[styles.roleLabel, { color: colors.text }]}>I want to join as a:</Text>
        <View style={styles.roleGrid}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedRole === UserRole.CUSTOMER ? (isDark ? { borderColor: colors.brand, backgroundColor: colors.brandLight } : styles.roleCardActive) : null,
            ]}
            onPress={() => setSelectedRole(UserRole.CUSTOMER)}
          >
            <Text style={styles.roleEmoji}>🍔</Text>
            <Text
              style={[
                styles.roleText,
                { color: colors.textSecondary },
                selectedRole === UserRole.CUSTOMER ? styles.roleTextActive : null,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedRole === UserRole.RESTAURANT_OWNER ? (isDark ? { borderColor: colors.brand, backgroundColor: colors.brandLight } : styles.roleCardActive) : null,
            ]}
            onPress={() => setSelectedRole(UserRole.RESTAURANT_OWNER)}
          >
            <Text style={styles.roleEmoji}>👨‍🍳</Text>
            <Text
              style={[
                styles.roleText,
                { color: colors.textSecondary },
                selectedRole === UserRole.RESTAURANT_OWNER ? styles.roleTextActive : null,
              ]}
            >
              Merchant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedRole === UserRole.DELIVERY_DRIVER ? (isDark ? { borderColor: colors.brand, backgroundColor: colors.brandLight } : styles.roleCardActive) : null,
            ]}
            onPress={() => setSelectedRole(UserRole.DELIVERY_DRIVER)}
          >
            <Text style={styles.roleEmoji}>🛵</Text>
            <Text
              style={[
                styles.roleText,
                { color: colors.textSecondary },
                selectedRole === UserRole.DELIVERY_DRIVER ? styles.roleTextActive : null,
              ]}
            >
              Courier
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <Input
          label="Full Name *"
          placeholder="e.g. John Doe"
          value={name}
          onChangeText={setName}
          leftIcon={<User size={20} color="#9CA3AF" />}
        />

        <Input
          label="Email Address *"
          placeholder="e.g. john.doe@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Mail size={20} color="#9CA3AF" />}
        />

        <Input
          label="Phone Number"
          placeholder="+15551234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          leftIcon={<Phone size={20} color="#9CA3AF" />}
        />

        <Input
          label="Password *"
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          leftIcon={<Lock size={20} color="#9CA3AF" />}
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          isLoading={isLoading}
          style={styles.submitButton}
        />

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    marginBottom: 20,
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
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#FF4B3A',
    backgroundColor: '#FFF5F4',
  },
  roleEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  roleTextActive: {
    color: '#FF4B3A',
  },
  submitButton: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4B3A',
  },
});
