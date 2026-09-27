import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  "#eaf5f3",
          100: "#c5e8e2",
          200: "#9dd8ce",
          300: "#6ec5b9",
          400: "#3bafa0",
          500: "#0d9488",
          600: "#0d6b5e",
          700: "#0a5249",
          800: "#073a35",
          900: "#042420",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
