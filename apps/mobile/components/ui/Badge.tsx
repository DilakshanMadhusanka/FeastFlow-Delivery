import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const { isDark } = useTheme();

  const getBadgeStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];
    if (variant === 'success') list.push(isDark ? styles.successBgDark : styles.successBg);
    else if (variant === 'warning') list.push(isDark ? styles.warningBgDark : styles.warningBg);
    else if (variant === 'error') list.push(isDark ? styles.errorBgDark : styles.errorBg);
    else if (variant === 'info') list.push(isDark ? styles.infoBgDark : styles.infoBg);
    else list.push(isDark ? styles.neutralBgDark : styles.neutralBg);
    if (style) list.push(style);
    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.text];
    if (variant === 'success') list.push(isDark ? styles.successTextDark : styles.successText);
    else if (variant === 'warning') list.push(isDark ? styles.warningTextDark : styles.warningText);
    else if (variant === 'error') list.push(isDark ? styles.errorTextDark : styles.errorText);
    else if (variant === 'info') list.push(isDark ? styles.infoTextDark : styles.infoText);
    else list.push(isDark ? styles.neutralTextDark : styles.neutralText);
    return list;
  };

  return (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  successBg: { backgroundColor: '#DCFCE7' },
  successText: { color: '#166534' },
  successBgDark: { backgroundColor: '#064E3B' },
  successTextDark: { color: '#6EE7B7' },
  warningBg: { backgroundColor: '#FEF3C7' },
  warningText: { color: '#92400E' },
  warningBgDark: { backgroundColor: '#78350F' },
  warningTextDark: { color: '#FDE68A' },
  errorBg: { backgroundColor: '#FEE2E2' },
  errorText: { color: '#991B1B' },
  errorBgDark: { backgroundColor: '#7F1D1D' },
  errorTextDark: { color: '#FCA5A5' },
  infoBg: { backgroundColor: '#DBEAFE' },
  infoText: { color: '#1E40AF' },
  infoBgDark: { backgroundColor: '#1E3A8A' },
  infoTextDark: { color: '#93C5FD' },
  neutralBg: { backgroundColor: '#F3F4F6' },
  neutralText: { color: '#4B5563' },
  neutralBgDark: { backgroundColor: '#374151' },
  neutralTextDark: { color: '#D1D5DB' },
});
