import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const getBadgeStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];
    if (variant === 'success') list.push(styles.successBg);
    else if (variant === 'warning') list.push(styles.warningBg);
    else if (variant === 'error') list.push(styles.errorBg);
    else if (variant === 'info') list.push(styles.infoBg);
    else list.push(styles.neutralBg);
    if (style) list.push(style);
    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.text];
    if (variant === 'success') list.push(styles.successText);
    else if (variant === 'warning') list.push(styles.warningText);
    else if (variant === 'error') list.push(styles.errorText);
    else if (variant === 'info') list.push(styles.infoText);
    else list.push(styles.neutralText);
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
  warningBg: { backgroundColor: '#FEF3C7' },
  warningText: { color: '#92400E' },
  errorBg: { backgroundColor: '#FEE2E2' },
  errorText: { color: '#991B1B' },
  infoBg: { backgroundColor: '#DBEAFE' },
  infoText: { color: '#1E40AF' },
  neutralBg: { backgroundColor: '#F3F4F6' },
  neutralText: { color: '#4B5563' },
});
