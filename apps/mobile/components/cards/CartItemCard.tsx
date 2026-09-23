import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { CartItemModel } from '../../services/cart.service';
import { formatCurrency } from '../../utils/formatters';

interface CartItemCardProps {
  item: CartItemModel;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.unitPrice}>${formatCurrency(item.basePrice)} each</Text>
        </View>

        <TouchableOpacity onPress={onRemove} style={styles.deleteButton}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Add-ons List */}
      {item.addons && item.addons.length > 0 ? (
        <View style={styles.addonsList}>
          {item.addons.map((a) => (
            <Text key={a.id} style={styles.addonText}>
              + {a.name} (${formatCurrency(a.price)})
            </Text>
          ))}
        </View>
      ) : null}

      {/* Special Instructions */}
      {item.specialInstructions ? (
        <Text style={styles.instructionsText}>Note: "{item.specialInstructions}"</Text>
      ) : null}

      {/* Footer: Stepper and Line Subtotal */}
      <View style={styles.footerRow}>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepperBtn} onPress={onDecrease}>
            <Minus size={16} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={onIncrease}>
            <Plus size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtotal}>${formatCurrency(item.lineSubtotal)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  unitPrice: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  addonsList: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  addonText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  instructionsText: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF4B3A',
  },
});
