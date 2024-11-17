"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = {
  displayName: string;
  type: "light" | "dark";
  scheme: {
    primary: string;
    primaryFont: string;
    primaryFontLight: string;
    secondary: string;
    secondaryLight: string;
    secondaryActive: string;
    primaryOpaque: string;
    primaryDarkOpaque: string;
    lightOpaque: string;
    opaque: string;
    opaqueActive: string;
  };
};

export const THEMES: Theme[] = [
  {
    displayName: "Light",
    scheme: {
      primary: "white",
      primaryFont: "black",
      primaryFontLight: "#464646",
      secondary: "rgba(245,245,245,1)",
      secondaryLight: "rgba(250,250,250,1)",
      secondaryActive: "rgba(240,240,240,1)",
      primaryOpaque: "rgba(255, 255, 255, 0.5)",
      primaryDarkOpaque: "rgba(255, 255, 255, 0.7)",
      lightOpaque: "rgba(0, 0, 0, 0.05)",
      opaque: "rgba(0, 0, 0, 0.2)",
      opaqueActive: "rgba(0, 0, 0, 0.3)",
    },
    type: "light",
  },
  {
    displayName: "Dark",
    scheme: {
      primary: "#000",
      primaryFont: "#eeeeee",
      primaryFontLight: "#b8b8b8",
      secondary: "#181818",
      secondaryLight: "rgba(10,10,10,1)",
      secondaryActive: "#292929",
      primaryOpaque: "rgba(8, 8, 8, 0.5)",
      primaryDarkOpaque: "rgba(8, 8, 8, 0.7)",
      lightOpaque: "rgba(255, 255, 255, 0.05)",
      opaque: "rgba(255, 255, 255, 0.200)",
      opaqueActive: "rgba(255, 255, 255, 0.300)",
    },
    type: "dark",
  },
];

export const setTheme = (theme: Theme) => {
  const fullTheme = {
    ...theme.scheme,
  };
  for (const property in fullTheme) {
    const val = fullTheme[property as keyof typeof fullTheme];
    document.documentElement.style.setProperty("--cui-" + property, val);
  }
};

export const useThemeDetector = () => {
  const getCurrentTheme = () =>
    window?.matchMedia("(prefers-color-scheme: dark)")?.matches;
  const [isDarkTheme, setIsDarkTheme] = useState<boolean | null>(null);
  const mqListener = (e: any) => {
    setIsDarkTheme(e.matches);
  };

  useEffect(() => {
    setIsDarkTheme(getCurrentTheme());
    const darkThemeMq = window?.matchMedia("(prefers-color-scheme: dark)");
    darkThemeMq.addListener(mqListener);
    return () => darkThemeMq.removeListener(mqListener);
  }, []);
  return isDarkTheme;
};

type ThemeContextType = [Theme | null, (theme: Theme | null) => void];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider(props: { children: React.ReactNode }) {
  const isDarkTheme = useThemeDetector();
  const [theme, setThemeState] = useState<Theme | null>(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      return JSON.parse(storedTheme);
    }
    return null; // Default to system theme
  });

  const updateTheme = (theme: Theme | null) => {
    setThemeState(theme);
    if (theme) {
      localStorage.setItem("theme", JSON.stringify(theme));
      setTheme(theme);
    } else {
      localStorage.removeItem("theme");
      setTheme(isDarkTheme ? THEMES[1] : THEMES[0]);
    }
  };

  useEffect(() => {
    if (theme === null) {
      setTheme(isDarkTheme ? THEMES[1] : THEMES[0]);
    } else {
      updateTheme(theme);
    }
  }, [theme, isDarkTheme]);

  return (
    <ThemeContext.Provider value={[theme, updateTheme]}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): [Theme | null, (theme: Theme | null) => void] => {
  const context = useContext(ThemeContext);
  const isDarkTheme = useThemeDetector();
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  const [currentTheme, updateTheme] = context; // Explicitly destructure with type annotation

  return [currentTheme || (isDarkTheme ? THEMES[1] : THEMES[0]), updateTheme];
};
