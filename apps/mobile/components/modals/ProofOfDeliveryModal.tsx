import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Camera,
  CheckCircle2,
  X,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/useTheme';

interface ProofOfDeliveryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (proofNotes: string, photoTaken: boolean) => void;
  orderNumber: string;
  customerName: string;
  dropoffAddress: string;
  isLoading?: boolean;
}

const DROPOFF_LOCATIONS = [
  'Front Door / Porch',
  'Building Reception / Lobby',
  'Handed to Customer',
  'Mailroom / Parcel Locker',
];

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  orderNumber,
  customerName,
  dropoffAddress,
  isLoading = false,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedLocation, setSelectedLocation] = useState(DROPOFF_LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState<string | null>(null);

  const handleTakeSimulatedPhoto = () => {
    if (photoTaken) {
      setPhotoTaken(false);
      setPhotoTimestamp(null);
    } else {
      setPhotoTaken(true);
      setPhotoTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  const handleComplete = () => {
    const combinedNotes = `${selectedLocation}${notes.trim() ? ` - ${notes.trim()}` : ''}`;
    onConfirm(combinedNotes, photoTaken);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, isDark && { backgroundColor: colors.brandLight }]}>
                <Camera size={20} color="#FF4B3A" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Proof of Delivery</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Order #{orderNumber} • {customerName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6' }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Destination Pill */}
            <View style={[styles.addressPill, isDark && { backgroundColor: '#450A0A' }]}>
              <MapPin size={16} color="#DC2626" />
              <Text style={[styles.addressText, isDark && { color: '#FCA5A5' }]} numberOfLines={1}>{dropoffAddress}</Text>
            </View>

            {/* Drop-off Placement Chips */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Where was the order left?</Text>
            <View style={styles.chipRow}>
              {DROPOFF_LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.locationChip,
                      { backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6', borderColor: colors.border },
                      isSelected && styles.locationChipActive,
                    ]}
                    onPress={() => setSelectedLocation(loc)}
                  >
                    <Text style={[styles.locationChipText, { color: colors.textSecondary }, isSelected && styles.locationChipTextActive]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Camera / Photo Capture Zone */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Drop-off Photo Verification</Text>
            <TouchableOpacity
              style={[
                styles.cameraBox,
                { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB', borderColor: colors.border },
                photoTaken && styles.cameraBoxTaken,
              ]}
              onPress={handleTakeSimulatedPhoto}
              activeOpacity={0.8}
            >
              {photoTaken ? (
                <View style={styles.photoPreviewContent}>
                  <View style={styles.watermarkOverlay}>
                    <ShieldCheck size={14} color="#166534" />
                    <Text style={styles.watermarkText}>VERIFIED DROPOFF • {photoTimestamp}</Text>
                  </View>
                  <View style={styles.simulatedPhotoGraphic}>
                    <Camera size={36} color="#16A34A" />
                    <Text style={styles.simulatedPhotoText}>Photo Captured & Encrypted</Text>
                    <Text style={styles.simulatedPhotoSub}>Tap to retake photo</Text>
                  </View>
                  <View style={styles.retakePill}>
                    <RefreshCw size={12} color="#166534" />
                    <Text style={styles.retakeText}>Retake</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cameraPlaceholderContent}>
                  <View style={[styles.cameraIconCircle, isDark && { backgroundColor: colors.brandLight }]}>
                    <Camera size={26} color="#FF4B3A" />
                  </View>
                  <Text style={[styles.cameraPromptText, { color: colors.text }]}>Tap to Capture Drop-off Photo</Text>
                  <Text style={[styles.cameraPromptSub, { color: colors.textMuted }]}>Shows customer safe package placement</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Drop-off Note / Buzzer Input */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Additional Delivery Note (Optional)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: isDark ? colors.surfaceSecondary : '#F9FAFB', borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Left right next to green potted plant on porch"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <View style={[styles.guaranteeBox, isDark && { backgroundColor: '#064E3B' }]}>
              <ShieldCheck size={16} color={isDark ? '#6EE7B7' : '#059669'} />
              <Text style={[styles.guaranteeText, isDark && { color: '#A7F3D0' }]}>
                Proof of delivery protects you from dispute claims and instantly releases trip payout.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <Button
              title="Confirm Handover & Finish"
              size="lg"
              variant="primary"
              isLoading={isLoading}
              onPress={handleComplete}
              style={styles.finishBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  locationChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  locationChipTextActive: {
    color: '#FFFFFF',
  },
  cameraBox: {
    height: 135,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cameraBoxTaken: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  cameraPlaceholderContent: {
    alignItems: 'center',
    gap: 6,
  },
  cameraIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  cameraPromptSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  photoPreviewContent: {
    flex: 1,
    width: '100%',
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watermarkOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  watermarkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  simulatedPhotoGraphic: {
    alignItems: 'center',
    gap: 4,
  },
  simulatedPhotoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  simulatedPhotoSub: {
    fontSize: 11,
    color: '#047857',
  },
  retakePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  retakeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 65,
    marginBottom: 14,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  finishBtn: {
    width: '100%',
  },
});
