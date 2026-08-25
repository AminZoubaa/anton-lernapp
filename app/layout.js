import { Andika } from "next/font/google";
import "./globals.css";

// Andika: klare Druckschrift für Leseanfänger (SIL), keine Schnörkel –
// Buchstabenformen wie in der Schule gelernt.
const andika = Andika({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata = {
  title: "ABC & 123 – Lernspaß",
  description: "Buchstaben und Zahlen lernen für Vorschulkinder",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className={andika.className}>{children}</body>
    </html>
  );
}
