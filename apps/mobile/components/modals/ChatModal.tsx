import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Send, MessageSquare, Sparkles, User, Bike, Store } from 'lucide-react-native';
import { mobileChatService, MobileChatMessage } from '../../services/chat.service';

interface ChatModalProps {
  isOpen?: boolean;
  visible?: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  userRole?: 'CUSTOMER' | 'COURIER';
  role?: 'CUSTOMER' | 'COURIER';
  partnerName?: string;
  recipientName?: string;
  targetRole?: 'COURIER' | 'STORE' | 'CUSTOMER';
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  visible,
  onClose,
  orderId,
  orderNumber,
  userRole,
  role,
  partnerName,
  recipientName,
  targetRole,
}) => {
  const modalVisible = visible ?? isOpen ?? false;
  const activeRole = role ?? userRole ?? 'CUSTOMER';
  const effectivePartner = recipientName ?? partnerName ?? (targetRole === 'STORE' ? 'Restaurant Support' : 'Delivery Driver');

  const [messages, setMessages] = useState<MobileChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isCustomer = activeRole === 'CUSTOMER';

  const customerQuickReplies = [
    '🚪 Please leave by the front door',
    '🔔 Please don\'t ring doorbell',
    '🏢 Waiting in the lobby',
    '🙏 Thank you so much!',
  ];

  const courierQuickReplies = [
    '📍 I have arrived at the gate/door',
    '🚦 In traffic, arriving in ~4 mins',
    '🏢 I am in the lobby',
    '📦 Food placed safely at doorstep',
  ];

  const quickReplies = isCustomer ? customerQuickReplies : courierQuickReplies;

  const loadMessages = async () => {
    if (!orderId) return;
    try {
      const data = await mobileChatService.getMessages(orderId);
      setMessages(data);
    } catch (err) {
      console.warn('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    if (modalVisible && orderId) {
      setLoading(true);
      loadMessages().finally(() => setLoading(false));
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [modalVisible, orderId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const newMsg = await mobileChatService.sendMessage(orderId, text, activeRole);
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err: any) {
      console.warn('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!modalVisible) return null;

  return (
    <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <MessageSquare size={20} color="#FF4B3A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Order #{orderNumber} Chat</Text>
              <Text style={styles.headerSubtitle}>
                {effectivePartner ? `Messaging ${effectivePartner}` : isCustomer ? 'Courier & Store Support' : 'Customer & Store'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Message Transcript */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
        >
          {loading && messages.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF4B3A" size="small" />
              <Text style={styles.loadingText}>Connecting to order channel...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <MessageSquare size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                Send a quick update or delivery instruction below.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderRole === userRole;
              const isStore = msg.senderRole === 'STORE';

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubbleRow,
                    isMe ? styles.messageRowMe : styles.messageRowOther,
                  ]}
                >
                  <View style={styles.metaRow}>
                    <Text style={styles.senderLabel}>
                      {isMe ? 'You' : msg.senderName} ({msg.senderRole})
                    </Text>
                    <Text style={styles.timeLabel}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? styles.bubbleMe
                        : isStore
                        ? styles.bubbleStore
                        : styles.bubbleOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isMe || isStore ? styles.bubbleTextLight : styles.bubbleTextDark,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Canned Quick Reply Chips */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesScroll}
          >
            {quickReplies.map((reply, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickChip}
                activeOpacity={0.7}
                onPress={() => handleSend(reply)}
              >
                <Text style={styles.quickChipText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isCustomer ? 'Message your driver or kitchen...' : 'Message the customer...'}
            placeholderTextColor="#94A3B8"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() || sending ? styles.sendBtnDisabled : null,
            ]}
            disabled={!inputText.trim() || sending}
            onPress={() => handleSend()}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContent: {
    paddingVertical: 16,
    gap: 12,
  },
  loadingBox: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyBox: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },
  messageBubbleRow: {
    maxWidth: '82%',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  timeLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#FF4B3A',
    borderBottomRightRadius: 4,
  },
  bubbleStore: {
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextLight: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextDark: {
    color: '#0F172A',
    fontWeight: '500',
  },
  quickRepliesContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#0F172A',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF4B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
