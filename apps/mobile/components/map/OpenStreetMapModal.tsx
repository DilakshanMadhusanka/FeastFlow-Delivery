import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { X, Navigation, Layers, ShieldCheck, MapPin, Bike, Utensils } from 'lucide-react-native';
import { OSMMarker, calculateDistanceKm } from './osmHelper';
import { OpenStreetMap } from './OpenStreetMap';
import { useTheme } from '../../theme/useTheme';

interface OpenStreetMapModalProps {
  visible: boolean;
  onClose: () => void;
  center: { latitude: number; longitude: number };
  markers?: OSMMarker[];
  routeCoordinates?: Array<[number, number]>;
  title?: string;
  subtitle?: string;
}

export const OpenStreetMapModal: React.FC<OpenStreetMapModalProps> = ({
  visible,
  onClose,
  center,
  markers = [],
  routeCoordinates = [],
  title = 'Live OpenStreetMap Route',
  subtitle = 'Satellite & Slippy Cartography Powered by OSM',
}) => {
  const { colors, isDark } = useTheme();
  const [tileLayer, setTileLayer] = useState<'STANDARD' | 'HUMANITARIAN' | 'CARTO_LIGHT' | 'CARTO_DARK'>(
    isDark ? 'CARTO_DARK' : 'STANDARD'
  );

  // Calculate distance if there are at least two markers
  let distanceKm: number | null = null;
  if (markers.length >= 2) {
    distanceKm = calculateDistanceKm(
      markers[0].latitude,
      markers[0].longitude,
      markers[markers.length - 1].latitude,
      markers[markers.length - 1].longitude
    );
  }

  const layersList = (isDark
    ? (['CARTO_DARK', 'STANDARD', 'HUMANITARIAN'] as const)
    : (['STANDARD', 'CARTO_LIGHT', 'HUMANITARIAN'] as const));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#FFF1F2' }]}>
              <Navigation size={20} color="#FF4B3A" />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6' }]}
            hitSlop={10}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Layer Selector Bar */}
        <View style={[styles.layerBar, { backgroundColor: isDark ? colors.cardAlt : '#F9FAFB', borderBottomColor: colors.border }]}>
          <View style={styles.layerTitleRow}>
            <Layers size={14} color={colors.textSecondary} />
            <Text style={[styles.layerBarTitle, { color: colors.textSecondary }]}>OSM Tiles:</Text>
          </View>
          <View style={styles.layerChips}>
            {layersList.map((layer) => (
              <TouchableOpacity
                key={layer}
                style={[
                  styles.layerChip,
                  { backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF', borderColor: isDark ? colors.border : '#D1D5DB' },
                  tileLayer === layer && styles.layerChipActive,
                ]}
                onPress={() => setTileLayer(layer)}
              >
                <Text
                  style={[
                    styles.layerChipText,
                    { color: isDark ? colors.textSecondary : '#4B5563' },
                    tileLayer === layer && styles.layerChipTextActive,
                  ]}
                >
                  {layer === 'STANDARD'
                    ? 'Standard OSM'
                    : layer === 'CARTO_LIGHT'
                    ? 'Clean Light'
                    : layer === 'CARTO_DARK'
                    ? 'Carto Dark'
                    : 'Hot Relief'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fullscreen Map Body */}
        <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
          <OpenStreetMap
            center={center}
            zoom={15}
            markers={markers}
            routeCoordinates={routeCoordinates}
            tileLayer={tileLayer}
            height="100%"
            interactive={true}
            showControls={true}
            fitBounds={true}
            showExpandBtn={false}
          />
        </View>

        {/* Bottom Route Summary Drawer */}
        <View style={[styles.summaryDrawer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.drawerTop}>
            <View style={styles.distanceBadge}>
              <Text style={[styles.distanceValue, { color: colors.text }]}>{distanceKm ? `${distanceKm} km` : 'Active Route'}</Text>
              <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>Total Delivery Corridor</Text>
            </View>
            <View style={[styles.legalBadge, isDark && { backgroundColor: '#064E3B' }]}>
              <ShieldCheck size={13} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.legalText, isDark && { color: '#34D399' }]}>OpenStreetMap • ODbL Open Cartography</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markersScroll}>
            {markers.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.markerCard,
                  { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB', borderColor: colors.border },
                ]}
              >
                <View style={styles.markerCardHeader}>
                  {m.type === 'STORE' ? (
                    <Utensils size={15} color="#EA580C" />
                  ) : m.type === 'CUSTOMER' ? (
                    <MapPin size={15} color="#10B981" />
                  ) : (
                    <Bike size={15} color="#7C3AED" />
                  )}
                  <Text style={[styles.markerType, { color: colors.textSecondary }]}>
                    {m.type === 'STORE' ? 'Store Pickup' : m.type === 'CUSTOMER' ? 'Dropoff Dest' : 'Courier Partner'}
                  </Text>
                </View>
                <Text style={[styles.markerTitle, { color: colors.text }]} numberOfLines={1}>{m.title}</Text>
                {m.description ? (
                  <Text style={[styles.markerDesc, { color: colors.textMuted }]} numberOfLines={1}>{m.description}</Text>
                ) : null}
                {m.speed ? (
                  <Text style={styles.markerSpeed}>Speed: {Math.round(m.speed)} km/h</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  layerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  layerBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  layerChips: {
    flexDirection: 'row',
    gap: 6,
  },
  layerChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  layerChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  layerChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  layerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryDrawer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceBadge: {
    gap: 1,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  distanceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  legalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  markersScroll: {
    gap: 10,
  },
  markerCard: {
    width: 170,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  markerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  markerType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  markerDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  markerSpeed: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 3,
  },
});
