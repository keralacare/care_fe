/* eslint-disable @typescript-eslint/no-var-requires */
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "sans-serif"],
      },
      colors: {
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
        accent: {
          100: "#def7ec",
          200: "#bcf0da",
          300: "#84e1bc",
          400: "#31c48d",
          500: "#0d9f6e",
          600: "#057a55",
          700: "#046c4e",
          800: "#03543F",
          900: "#014737",
          DEFAULT: "#0d9f6e",
        },
        danger: colors.red,
        warning: colors.amber,
        alert: colors.violet,
        gray: colors.gray,
        patient: {
          comfort: {
            DEFAULT: colors.slate[200],
            fore: colors.slate[700],
          },
          stable: {
            DEFAULT: "#59D4FF",
            fore: colors.white,
          },
          abnormal: {
            DEFAULT: "#F6CB23",
            fore: colors.yellow[900],
          },
          critical: {
            DEFAULT: colors.red[500],
            fore: colors.red[100],
          },
          unknown: {
            DEFAULT: colors.gray[400],
            fore: colors.gray[800],
          },
          activelydying: {
            DEFAULT: colors.red[800],
            fore: colors.red[100],
          },
        },
        primary: {
          DEFAULT: "rgb(var(--cui-theme-primary-default) / <alpha-value>)",
          50: "rgb(var(--cui-theme-primary-50) / <alpha-value>)",
          100: "rgb(var(--cui-theme-primary-100) / <alpha-value>)",
          200: "rgb(var(--cui-theme-primary-200) / <alpha-value>)",
          300: "rgb(var(--cui-theme-primary-300) / <alpha-value>)",
          400: "rgb(var(--cui-theme-primary-400) / <alpha-value>)",
          500: "rgb(var(--cui-theme-primary-500) / <alpha-value>)",
          600: "rgb(var(--cui-theme-primary-600) / <alpha-value>)",
          700: "rgb(var(--cui-theme-primary-700) / <alpha-value>)",
          800: "rgb(var(--cui-theme-primary-800) / <alpha-value>)",
          900: "rgb(var(--cui-theme-primary-900) / <alpha-value>)",
          950: "rgb(var(--cui-theme-primary-950) / <alpha-value>)",
        },
      },
      scale: {
        25: "0.25",
        175: "1.75",
        200: "2",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  content: [
    "./src/**/*.{html,md,js,jsx,ts,tsx}",
    "./apps/**/*.{html,md,js,jsx,ts,tsx}",
    "./index.html",
  ],
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
    require("tailwindcss-animate"),
  ],
};
