import { Andika } from "next/font/google";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";

// Andika: klare Druckschrift für Leseanfänger (SIL), keine Schnörkel –
// Buchstabenformen wie in der Schule gelernt.
const andika = Andika({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

// Auf GitHub Pages liegt alles unter /anton-lernapp
const prefix = process.env.GITHUB_PAGES === "true" ? "/anton-lernapp" : "";

export const metadata = {
  title: "ABC & 123 – Lernspaß",
  description: "Buchstaben und Zahlen lernen für Vorschulkinder",
  manifest: `${prefix}/manifest.json`,
  icons: {
    icon: `${prefix}/icon-192.png`,
    apple: `${prefix}/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ABC & 123",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1cb0f6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className={andika.className}>
        {children}
        <PwaSetup prefix={prefix} />
      </body>
    </html>
  );
}
