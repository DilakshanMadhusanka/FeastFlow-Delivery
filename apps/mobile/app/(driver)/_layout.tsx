import React from 'react';
import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="active-delivery" />
      <Stack.Screen name="earnings" />
    </Stack>
  );
}
