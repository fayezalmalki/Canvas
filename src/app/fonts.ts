import localFont from "next/font/local";

export const thmanyahSans = localFont({
  src: [
    { path: "./fonts/thmanyah/sans/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyah/sans/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyah/sans/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyah/sans/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/thmanyah/sans/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--ff-thmanyah-sans",
  display: "swap",
});

export const thmanyahSerifDisplay = localFont({
  src: [
    { path: "./fonts/thmanyah/serif-display/thmanyahserifdisplay-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyah/serif-display/thmanyahserifdisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyah/serif-display/thmanyahserifdisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyah/serif-display/thmanyahserifdisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/thmanyah/serif-display/thmanyahserifdisplay-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--ff-thmanyah-serif-display",
  display: "swap",
});

export const thmanyahSerifText = localFont({
  src: [
    { path: "./fonts/thmanyah/serif-text/thmanyahseriftext-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyah/serif-text/thmanyahseriftext-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyah/serif-text/thmanyahseriftext-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyah/serif-text/thmanyahseriftext-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/thmanyah/serif-text/thmanyahseriftext-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--ff-thmanyah-serif-text",
  display: "swap",
});
