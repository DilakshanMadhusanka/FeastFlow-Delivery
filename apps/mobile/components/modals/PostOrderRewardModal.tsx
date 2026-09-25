import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Share,
} from 'react-native';
import {
  Gift,
  Sparkles,
  Copy,
  Check,
  X,
  Flame,
  Tag,
  ArrowRight,
} from 'lucide-react-native';
import { Button } from '../ui/Button';

interface PostOrderRewardModalProps {
  visible: boolean;
  onClose: () => void;
  onUseCode?: (code: string) => void;
}

export const PostOrderRewardModal: React.FC<PostOrderRewardModalProps> = ({
  visible,
  onClose,
  onUseCode,
}) => {
  const [isScratched, setIsScratched] = useState(false);
  const [copied, setCopied] = useState(false);
  const promoCode = 'FEAST15';

  const handleCopyCode = async () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUseReward = () => {
    if (onUseCode) {
      onUseCode(promoCode);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Celebration Header */}
          <View style={styles.headerIconWrapper}>
            <View style={styles.headerIconCircle}>
              <Gift size={32} color="#FF4B3A" />
            </View>
            <View style={styles.sparkleBadge}>
              <Sparkles size={14} color="#D97706" />
            </View>
          </View>

          <Text style={styles.modalTitle}>Order Completed! 🎉</Text>
          <Text style={styles.modalSubtitle}>
            As a thank-you from FeastFlow, you've unlocked a mystery reward card for your next craving!
          </Text>

          {/* Scratch Card / Mystery Box */}
          <TouchableOpacity
            style={[styles.scratchCard, isScratched && styles.scratchCardRevealed]}
            activeOpacity={0.85}
            onPress={() => setIsScratched(true)}
          >
            {isScratched ? (
              <View style={styles.revealedContent}>
                <View style={styles.rewardTopRow}>
                  <Flame size={16} color="#EA580C" />
                  <Text style={styles.rewardTagText}>15% DISCOUNT UNLOCKED</Text>
                </View>

                <Text style={styles.rewardValueText}>15% OFF</Text>
                <Text style={styles.rewardSubText}>Valid on any restaurant up to $10 savings</Text>

                <View style={styles.codeBox}>
                  <View style={styles.codeTextRow}>
                    <Tag size={15} color="#FF4B3A" />
                    <Text style={styles.codeText}>{promoCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                    onPress={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <Check size={14} color="#FFFFFF" />
                        <Text style={styles.copyBtnText}>Copied!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#FF4B3A" />
                        <Text style={[styles.copyBtnText, { color: '#FF4B3A' }]}>Copy</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.unscratchedContent}>
                <View style={styles.scratchPattern}>
                  <Sparkles size={24} color="#F59E0B" />
                  <Text style={styles.scratchPrompt}>Tap to Scratch & Reveal 🎁</Text>
                  <Text style={styles.scratchSub}>Your mystery meal discount is inside</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionButtons}>
            {isScratched ? (
              <Button
                title="Save & Browse Restaurants"
                variant="primary"
                size="lg"
                onPress={handleUseReward}
                style={styles.actionBtn}
              />
            ) : (
              <Button
                title="Reveal My Reward"
                variant="primary"
                size="lg"
                onPress={() => setIsScratched(true)}
                style={styles.actionBtn}
              />
            )}
            <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerIconWrapper: {
    position: 'relative',
    marginBottom: 14,
    marginTop: 4,
  },
  headerIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFE4E6',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  scratchCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    padding: 18,
    borderWidth: 2,
    borderColor: '#D97706',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 145,
    marginBottom: 22,
  },
  scratchCardRevealed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderStyle: 'solid',
  },
  unscratchedContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchPattern: {
    alignItems: 'center',
    gap: 6,
  },
  scratchPrompt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  scratchSub: {
    fontSize: 11,
    color: '#FEF3C7',
    fontWeight: '600',
  },
  revealedContent: {
    width: '100%',
    alignItems: 'center',
  },
  rewardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  rewardTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  rewardValueText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  rewardSubText: {
    fontSize: 11,
    color: '#78350F',
    marginBottom: 12,
  },
  codeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  codeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    width: '100%',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
