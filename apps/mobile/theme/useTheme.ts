import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { colors, isDark, themeMode, toggleTheme, setThemeMode } = useThemeStore();
  return {
    colors,
    isDark,
    themeMode,
    toggleTheme,
    setThemeMode,
  };
}
