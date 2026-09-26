import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../theme/useTheme';

export default function DriverLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="active-delivery" />
      <Stack.Screen name="earnings" />
    </Stack>
  );
}
