import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    if (variant === 'primary') list.push(styles.primary);
    else if (variant === 'secondary') list.push(styles.secondary);
    else if (variant === 'outline') list.push(styles.outline);
    else if (variant === 'ghost') list.push(styles.ghost);
    else if (variant === 'danger') list.push(styles.danger);

    if (disabled || isLoading) list.push(styles.disabled);
    if (style) list.push(style as ViewStyle);

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.textBase];

    if (size === 'sm') list.push(styles.textSm);
    else if (size === 'lg') list.push(styles.textLg);
    else list.push(styles.textMd);

    if (variant === 'primary' || variant === 'danger') list.push(styles.textWhite);
    else if (variant === 'secondary') list.push(styles.textDark);
    else if (variant === 'outline' || variant === 'ghost') list.push(styles.textPrimaryColor);

    return list;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || isLoading}
      style={getContainerStyle()}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#FF4B3A'} />
      ) : (
        <>
          {leftIcon ? leftIcon : null}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon ? rightIcon : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 8,
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: '#FF4B3A', // Vibrant food-delivery orange-red
  },
  secondary: {
    backgroundColor: '#F3F4F6',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF4B3A',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  disabled: {
    opacity: 0.6,
  },
  textBase: {
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: '#1F2937',
  },
  textPrimaryColor: {
    color: '#FF4B3A',
  },
});
