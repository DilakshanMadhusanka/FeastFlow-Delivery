import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

interface RatingProps {
  score: number | string;
  reviewCount?: number;
  size?: number;
}

export const Rating: React.FC<RatingProps> = ({ score, reviewCount, size = 14 }) => {
  const { colors } = useTheme();
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  const formattedScore = !isNaN(numericScore) ? numericScore.toFixed(1) : '0.0';

  return (
    <View style={styles.container}>
      <Star size={size} color="#F59E0B" fill="#F59E0B" />
      <Text style={[styles.score, { fontSize: size, color: colors.text }]}>{formattedScore}</Text>
      {reviewCount !== undefined ? (
        <Text style={[styles.count, { fontSize: size - 1, color: colors.textMuted }]}>({reviewCount})</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  score: {
    fontWeight: '700',
    color: '#1F2937',
  },
  count: {
    color: '#6B7280',
    fontWeight: '500',
  },
});
