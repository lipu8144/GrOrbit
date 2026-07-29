/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#E08A5B", dark: "#C97245", soft: "#F6EFE6" },
        sage: { DEFAULT: "#A3C481", dark: "#87AC63", soft: "#F0F5E9" },
        charcoal: "#1F2937",
        // shadcn-style tokens used by the landing page design
        foreground: "#1F2937",
        background: "#FFFFFF",
        muted: "#F3F4F6",
        "muted-foreground": "#6B7280",
        border: "#E5E7EB",
        primary: { DEFAULT: "#E08A5B", foreground: "#FFFFFF" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
