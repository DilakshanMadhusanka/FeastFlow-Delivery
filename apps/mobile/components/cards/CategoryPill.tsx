import React from 'react';
import { Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface CategoryPillProps {
  id?: string;
  name: string;
  iconUrl?: string;
  isSelected: boolean;
  onPress: () => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  name,
  iconUrl,
  isSelected,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? colors.brand : colors.surfaceSecondary,
          borderColor: isSelected ? colors.brand : colors.borderLight,
        },
      ]}
      onPress={onPress}
    >
      {iconUrl ? (
        <Image source={{ uri: iconUrl }} style={styles.icon} resizeMode="cover" />
      ) : null}
      <Text
        style={[
          styles.name,
          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillSelected: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  nameSelected: {
    color: '#FFFFFF',
  },
});
