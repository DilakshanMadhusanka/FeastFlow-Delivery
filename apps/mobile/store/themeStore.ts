import { create } from 'zustand';
import { Appearance } from 'react-native';
import { getItem, setItem } from '../services/storage';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'feastflow_mobile_theme';

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  isInitialized: boolean;
  initializeTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const resolveIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'light',
  isDark: false,
  colors: lightColors,
  isInitialized: false,

  initializeTheme: async () => {
    try {
      const saved = await getItem(THEME_STORAGE_KEY);
      const mode = (saved as ThemeMode) || 'light';
      const isDark = resolveIsDark(mode);

      set({
        themeMode: mode,
        isDark,
        colors: isDark ? darkColors : lightColors,
        isInitialized: true,
      });

      // Listen for OS appearance changes
      Appearance.addChangeListener(({ colorScheme }) => {
        if (get().themeMode === 'system') {
          const dark = colorScheme === 'dark';
          set({
            isDark: dark,
            colors: dark ? darkColors : lightColors,
          });
        }
      });
    } catch {
      set({
        themeMode: 'light',
        isDark: false,
        colors: lightColors,
        isInitialized: true,
      });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    const isDark = resolveIsDark(mode);
    set({
      themeMode: mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
    await setItem(THEME_STORAGE_KEY, mode);
  },

  toggleTheme: async () => {
    const nextMode: ThemeMode = get().isDark ? 'light' : 'dark';
    await get().setThemeMode(nextMode);
  },
}));
