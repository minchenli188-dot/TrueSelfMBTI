"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ============================================================
// Types
// ============================================================

export type MBTITheme = "analyst" | "diplomat" | "sentinel" | "explorer" | "neutral";

interface ThemeColors {
  primary: string;
  primaryRgb: string;
  gradient: string;
  glow: string;
}

interface ThemeContextType {
  theme: MBTITheme;
  colors: ThemeColors;
  setTheme: (theme: MBTITheme) => void;
  setThemeFromPrediction: (prediction: string) => void;
}

// ============================================================
// Theme Definitions
// ============================================================

const THEME_COLORS: Record<MBTITheme, ThemeColors> = {
  analyst: {
    primary: "#88619a",
    primaryRgb: "136, 97, 154",
    gradient: "from-analyst/20 via-analyst/10 to-transparent",
    glow: "shadow-glow-analyst",
  },
  diplomat: {
    primary: "#33a474",
    primaryRgb: "51, 164, 116",
    gradient: "from-diplomat/20 via-diplomat/10 to-transparent",
    glow: "shadow-glow-diplomat",
  },
  sentinel: {
    primary: "#4298b4",
    primaryRgb: "66, 152, 180",
    gradient: "from-sentinel/20 via-sentinel/10 to-transparent",
    glow: "shadow-glow-sentinel",
  },
  explorer: {
    primary: "#e2a03f",
    primaryRgb: "226, 160, 63",
    gradient: "from-explorer/20 via-explorer/10 to-transparent",
    glow: "shadow-glow-explorer",
  },
  neutral: {
    primary: "#71717a",
    primaryRgb: "113, 113, 122",
    gradient: "from-foreground-subtle/20 via-foreground-subtle/10 to-transparent",
    glow: "",
  },
};

// Mapping from predictions to themes
const PREDICTION_TO_THEME: Record<string, MBTITheme> = {
  // Colors
  Purple: "analyst",
  Green: "diplomat",
  Blue: "sentinel",
  Yellow: "explorer",
  // Groups
  analyst: "analyst",
  diplomat: "diplomat",
  sentinel: "sentinel",
  explorer: "explorer",
  // NT Types (Analysts)
  INTJ: "analyst",
  INTP: "analyst",
  ENTJ: "analyst",
  ENTP: "analyst",
  // NF Types (Diplomats)
  INFJ: "diplomat",
  INFP: "diplomat",
  ENFJ: "diplomat",
  ENFP: "diplomat",
  // SJ Types (Sentinels)
  ISTJ: "sentinel",
  ISFJ: "sentinel",
  ESTJ: "sentinel",
  ESFJ: "sentinel",
  // SP Types (Explorers)
  ISTP: "explorer",
  ISFP: "explorer",
  ESTP: "explorer",
  ESFP: "explorer",
};

// ============================================================
// Context
// ============================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MBTITheme>("neutral");
  const [isMounted, setIsMounted] = useState(false);

  // Ensure DOM manipulation only happens on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update CSS custom properties when theme changes (client-side only)
  useEffect(() => {
    if (isMounted) {
      document.documentElement.style.setProperty(
        "--theme-primary",
        THEME_COLORS[theme].primary
      );
      document.documentElement.style.setProperty(
        "--theme-primary-rgb",
        THEME_COLORS[theme].primaryRgb
      );
    }
  }, [theme, isMounted]);

  const setTheme = useCallback((newTheme: MBTITheme) => {
    setThemeState(newTheme);
  }, []);

  const setThemeFromPrediction = useCallback(
    (prediction: string) => {
      const normalizedPrediction = prediction.trim();
      const mappedTheme = PREDICTION_TO_THEME[normalizedPrediction];
      
      if (mappedTheme) {
        setTheme(mappedTheme);
      }
    },
    [setTheme]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: THEME_COLORS[theme],
        setTheme,
        setThemeFromPrediction,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}


