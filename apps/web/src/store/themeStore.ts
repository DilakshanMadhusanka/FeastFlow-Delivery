import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const getSystemDark = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyThemeToDOM = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDark: false,

  setTheme: (theme: ThemeMode) => {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemDark());
    localStorage.setItem('feastflow_theme', theme);
    applyThemeToDOM(isDark);
    set({ theme, isDark });
  },

  toggleTheme: () => {
    const current = get().isDark;
    const nextTheme: ThemeMode = current ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    const saved = (localStorage.getItem('feastflow_theme') as ThemeMode) || 'light';
    const isDark = saved === 'dark' || (saved === 'system' && getSystemDark());
    applyThemeToDOM(isDark);
    set({ theme: saved, isDark });

    // Listen for OS scheme changes when in system mode
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (get().theme === 'system') {
          applyThemeToDOM(e.matches);
          set({ isDark: e.matches });
        }
      });
    }
  },
}));
