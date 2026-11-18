import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import LoadingLine from "@/components/Reusables/LoadingLine";
import AlertLayer from "@/components/Reusables/Alerts/AlertLayer";
import { ThemeProvider } from "next-themes";
import ThemeShortcut from "@/components/Reusables/ThemeProviders/ThemeShortcut";
import QueryProvider from "@/components/QueryProvider";

// "optional" rather than the default "swap": the preloaded font arrives
// within the ~100ms block period on the internal network, so text renders
// in Geist straight away instead of visibly swapping from the fallback. On
// a slow first load the page just stays in the (metric-matched) fallback
// and the next page uses the cached font.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "HAL Purchase Portal",
  description:
    "Hotpoint Staff Purchase Portal for streamlining staff product purchases online",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Hotpoint" />
      </head>
      <body className="bg-base-classes antialiased">
        <ThemeProvider
          enableSystem={true}
          defaultTheme="system"
          disableTransitionOnChange={true}
        >
          <ThemeShortcut />
          <LoadingLine />
          <AlertLayer />
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
