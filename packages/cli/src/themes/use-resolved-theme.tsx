import { createContext, useContext, type ReactNode } from "react";

import type { LoadedTheme } from "@/addon/api";

export interface ThemeContextValue {
  name: string;
  cssPath: string;
  frontendPath: string;
  theme: LoadedTheme;
  colorTokens: Record<string, string> | null;
  typography: Record<string, unknown> | null;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  value: ThemeContextValue;
  children: ReactNode;
}

export const ThemeProvider = ({ value, children }: ThemeProviderProps) => (
  <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
);

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme must be used inside <ThemeProvider>. Ensure your app is wrapped in ThemeProvider with a resolved theme.",
    );
  }
  return ctx;
};
