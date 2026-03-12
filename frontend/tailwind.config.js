/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"]
      },
      colors: {
        ink: "#102445",
        tide: "#214b8f",
        mist: "#edf4ff",
        sand: "#fffaf1"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(16, 36, 69, 0.12)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 20% 20%, rgba(112, 161, 255, 0.35), transparent 32%), radial-gradient(circle at 80% 0%, rgba(241, 183, 77, 0.28), transparent 28%), linear-gradient(135deg, #f7fbff 0%, #edf4ff 45%, #fff7e8 100%)"
      }
    }
  },
  plugins: []
};

