import type { Metadata } from "next";
import {
  Baloo_2,
  Bricolage_Grotesque,
  Figtree,
  Fraunces,
  Inter,
  Silkscreen,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// The 404's two faces, from the design file. They live only on that page.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
});

// Pixel face for the footer credits alone. One weight, because it appears in
// exactly one place and a second weight would ship for nothing.
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MeltingPot",
    template: "%s | MeltingPot",
  },
  description:
    "A shared class vault where contributing knowledge is as easy as typing what you know.",
};

// Applies the persisted theme before first paint so neither theme flashes.
// Nothing stored means dark: the owner's call, 2026-08-30. It has to be
// stamped here rather than left to the system preference, or a viewer whose
// machine is light would see light before the choice they never made is even
// readable. Only "system" leaves the attribute off and lets the media query
// decide.
const themeInit = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("mp-theme");if(t==="light"||t==="dark"){d.setAttribute("data-theme",t)}else if(t!=="system"){d.setAttribute("data-theme","dark")}if(localStorage.getItem("mp:nav-collapsed")==="1"){d.setAttribute("data-nav","collapsed")}}catch(e){d.setAttribute("data-theme","dark")}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} ${fraunces.variable} ${bricolage.variable} ${figtree.variable} ${baloo.variable} ${silkscreen.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
