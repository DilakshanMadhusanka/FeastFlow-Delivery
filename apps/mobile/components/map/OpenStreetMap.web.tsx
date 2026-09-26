import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Maximize2, Navigation } from 'lucide-react-native';
import { OSMMapOptions, generateOSMHtml } from './osmHelper';
import { useTheme } from '../../theme/useTheme';

export interface OpenStreetMapProps extends OSMMapOptions {
  height?: number | string;
  style?: any;
  showExpandBtn?: boolean;
  onExpandPress?: () => void;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  height = 230,
  style,
  showExpandBtn = true,
  onExpandPress,
  headerTitle,
  headerSubtitle,
  ...mapOptions
}) => {
  const { colors, isDark } = useTheme();

  const effectiveOptions = useMemo(() => ({
    ...mapOptions,
    isDark: mapOptions.isDark !== undefined ? mapOptions.isDark : isDark,
  }), [mapOptions, isDark]);

  const htmlContent = useMemo(() => generateOSMHtml(effectiveOptions), [effectiveOptions]);

  return (
    <View style={[styles.container, { height, backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {/* Optional Card Header */}
      {headerTitle ? (
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#FFF1F2' }]}>
              <Navigation size={14} color="#FF4B3A" />
            </View>
            <View>
              <Text style={[styles.headerText, { color: colors.text }]}>{headerTitle}</Text>
              {headerSubtitle ? (
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{headerSubtitle}</Text>
              ) : null}
            </View>
          </View>
          {showExpandBtn && onExpandPress ? (
            <TouchableOpacity
              onPress={onExpandPress}
              style={[styles.expandPill, { backgroundColor: colors.surfaceSecondary }]}
              hitSlop={8}
            >
              <Maximize2 size={12} color={colors.textSecondary} />
              <Text style={[styles.expandPillText, { color: colors.textSecondary }]}>Expand</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Map Frame Container */}
      <View style={[styles.frameContainer, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
        {React.createElement('iframe', {
          title: 'OpenStreetMap Web',
          srcDoc: htmlContent,
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 14,
          },
          sandbox: 'allow-scripts allow-same-origin',
        })}

        {/* Floating Expand button if no header is displayed */}
        {showExpandBtn && onExpandPress && !headerTitle ? (
          <TouchableOpacity
            onPress={onExpandPress}
            style={[styles.floatingExpandBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            hitSlop={6}
            activeOpacity={0.8}
          >
            <Maximize2 size={15} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  expandPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  frameContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  floatingExpandBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
});
