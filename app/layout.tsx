import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { CommandPaletteProvider } from "@/components/command-palette";
import { Sidebar } from "@/components/sidebar";
import { FILL_KEY } from "@/lib/preference-keys";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Tickstock", template: "%s · Tickstock" },
  description: "Watch 15 popular stocks: prices, charts, company stats and news.",
};

export const viewport: Viewport = {
  themeColor: "#151515",
  viewportFit: "cover",
};

/** Applies the saved chart-fill preference before first paint so shaded areas never flash on then off. */
const fillInitScript = `try{if(localStorage.getItem(${JSON.stringify(FILL_KEY)})==="off")document.documentElement.dataset.fill="off"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: fillInitScript }} />
      </head>
      <body className="min-h-dvh">
        <CommandPaletteProvider>
          <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
            <Sidebar />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
