"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import useKeyboardShortcut from "use-keyboard-shortcut";

import { cn } from "@/lib/utils";

import CareIcon from "@/CAREUI/icons/CareIcon";

export type ThemeColorRgb = `${number} ${number} ${number}`;

export type ThemeColor = {
  default: ThemeColorRgb;
  50: ThemeColorRgb;
  100: ThemeColorRgb;
  200: ThemeColorRgb;
  300: ThemeColorRgb;
  400: ThemeColorRgb;
  500: ThemeColorRgb;
  600: ThemeColorRgb;
  700: ThemeColorRgb;
  800: ThemeColorRgb;
  900: ThemeColorRgb;
  950: ThemeColorRgb;
};

export type Theme = {
  displayName: string;
  type: "light" | "dark";
  scheme: {
    primary: ThemeColor;
  };
};

/**
 * These were calculated by finding a suitable rgba value end which is divisible by 9. I came up with 216. Why not use something closer than 255? Because that would create a higher contrast with font and bg which might not look so good.
 * So - 216/9 = 24. Then just increment/decrement the theme rgba from the default value for each color stop.
 */
export const THEMES: Theme[] = [
  {
    displayName: "Light",
    scheme: {
      primary: {
        default: "255 255 255",
        50: "243 243 243",
        100: "231 231 231",
        200: "207 207 207",
        300: "183 183 183",
        400: "159 159 159",
        500: "135 135 135",
        600: "111 111 111",
        700: "87 87 87",
        800: "63 63 63",
        900: "39 39 39",
        950: "27 27 27",
      },
    },
    type: "light",
  },
  {
    displayName: "Dark",
    scheme: {
      primary: {
        default: "0 0 0",
        50: "12 12 12",
        100: "24 24 24",
        200: "48 48 48",
        300: "72 72 72",
        400: "96 96 96",
        500: "120 120 120",
        600: "144 144 144",
        700: "168 168 168",
        800: "192 192 192",
        900: "216 216 216",
        950: "228 228 228",
      },
    },
    type: "dark",
  },
];

export const setTheme = (theme: Theme) => {
  for (const property in theme.scheme) {
    const stops = theme.scheme[property as keyof typeof theme.scheme];
    Object.entries(stops).forEach(([color, rgb]) => {
      document.documentElement.style.setProperty(
        "--cui-theme-" + property + "-" + color,
        rgb,
      );
    });
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

type ThemeContextType = [number | null, (theme: number | null) => void];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider(props: { children: React.ReactNode }) {
  const isDarkTheme = useThemeDetector();
  const [theme, setThemeState] = useState<number | null>(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      return Number(storedTheme);
    }
    return null; // Default to system theme
  });

  const updateTheme = (theme: number | null) => {
    setThemeState(theme);
    if (theme !== null) {
      localStorage.setItem("theme", theme.toString());
      setTheme(THEMES[theme]);
    } else {
      localStorage.removeItem("theme");
      setTheme(THEMES[isDarkTheme ? 1 : 0]);
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
      <ThemeShortcut />
    </ThemeContext.Provider>
  );
}

export const useTheme = (): [
  {
    theme: Theme;
    themeIndex: number | null;
  } | null,
  (theme: number | null) => void,
] => {
  const context = useContext(ThemeContext);
  const isDarkTheme = useThemeDetector();
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  const [currentTheme, updateTheme] = context; // Explicitly destructure with type annotation

  return [
    {
      theme:
        currentTheme !== null
          ? THEMES[currentTheme]
          : isDarkTheme
            ? THEMES[1]
            : THEMES[0],
      themeIndex: currentTheme,
    },
    updateTheme,
  ];
};
const rgba = (color: ThemeColorRgb, alpha: number = 1) =>
  `rgba(${color.replaceAll(" ", ",")},${alpha})`;
export function ThemePicker() {
  const [currentTheme, setTheme] = useTheme();
  const isDarkTheme = useThemeDetector();
  const systemTheme = THEMES[isDarkTheme ? 1 : 0];

  const themeOptions: Theme[] = [
    {
      ...systemTheme,
      displayName: "System",
    },
    ...THEMES,
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {themeOptions.map((theme, index) => (
        <button
          onClick={() => setTheme(index === 0 ? null : index - 1)}
          className={cn(
            "bg-primary border-2 border-primary-100 rounded-lg p-2 hover:border-accent-400 transition-all",
            (index === 0
              ? currentTheme?.themeIndex === null
              : currentTheme?.themeIndex === index - 1) && "border-accent-500",
          )}
        >
          <div
            className="w-40 h-24 rounded-md p-2"
            style={{
              background: rgba(theme.scheme.primary[50]),
            }}
          >
            <div className="flex gap-2 items-center">
              <div
                className="w-14 aspect-square rounded-md"
                style={{ background: rgba(theme.scheme.primary[200]) }}
              />
              <div className="flex flex-col gap-1">
                <div
                  className="w-12 h-1.5 mb-1 rounded-lg"
                  style={{ background: rgba(theme.scheme.primary[950]) }}
                />
                <div
                  className="w-16 h-1 rounded-lg"
                  style={{ background: rgba(theme.scheme.primary[800]) }}
                />
                <div
                  className="w-14 h-1 rounded-lg"
                  style={{ background: rgba(theme.scheme.primary[800]) }}
                />
                <div
                  className="w-20 h-1 rounded-lg"
                  style={{ background: rgba(theme.scheme.primary[800]) }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-between">
              <div
                className="w-16 h-1 rounded-lg"
                style={{ background: rgba(theme.scheme.primary[950]) }}
              />
              <div
                className="w-12 h-4 rounded-t-md"
                style={{ background: rgba(theme.scheme.primary[200]) }}
              />
            </div>
          </div>
          <div className="font-bold mt-2">{theme.displayName}</div>
        </button>
      ))}
    </div>
  );
}

export function ThemeShortcut() {
  const [show, setShow] = useState(false);
  const [currentTheme, setTheme] = useTheme();
  const isDarkTheme = useThemeDetector();
  const systemTheme = THEMES[isDarkTheme ? 1 : 0];

  useKeyboardShortcut(["Shift", "T"], () => setShow(!show), {
    overrideSystem: true,
  });

  useKeyboardShortcut(["ArrowLeft"], () => {
    if (!currentTheme) return;
    const newIndex =
      currentTheme.themeIndex === null
        ? THEMES.length - 1
        : currentTheme.themeIndex === 0
          ? null
          : currentTheme?.themeIndex - 1;
    setTheme(newIndex);
  });

  useKeyboardShortcut(["ArrowRight"], () => {
    if (!currentTheme) return;
    const newIndex =
      currentTheme.themeIndex === null
        ? 0
        : currentTheme.themeIndex === THEMES.length - 1
          ? null
          : currentTheme?.themeIndex + 1;
    setTheme(newIndex);
  });

  useKeyboardShortcut(["Enter"], () => setShow(false));
  useKeyboardShortcut(["Escape"], () => setShow(false));

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.parentElement?.contains(event.target as Node)
      ) {
        setShow(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show]);

  return (
    <div
      className={`fixed transition-all ${
        show ? "bottom-8" : "-bottom-20"
      } flex items-center justify-center inset-x-0 z-[100]`}
    >
      <div
        ref={ref}
        className="bg-lightOpaque backdrop-blur-lg py-2 px-3 rounded-full flex items-center gap-2"
      >
        <button
          style={{
            background: rgba(systemTheme.scheme.primary.default),
            color: rgba(systemTheme.scheme.primary[950]),
          }}
          onClick={() => setTheme(null)}
          className={`w-5 h-5 rounded-full text-xs ${
            currentTheme?.themeIndex === null ? "ring-2 ring-accent-400" : ""
          }`}
        >
          <CareIcon icon="l-laptop" />
        </button>
        {THEMES?.map((theme, index) => (
          <button
            key={index}
            style={{
              background: rgba(theme.scheme.primary.default),
            }}
            className={`w-5 h-5 rounded-full ${
              index === currentTheme?.themeIndex ? "ring-2 ring-accent-400" : ""
            }`}
            onClick={() => setTheme(index)}
          />
        ))}
      </div>
    </div>
  );
}
