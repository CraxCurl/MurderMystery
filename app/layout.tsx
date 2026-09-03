import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMurdle - AI Murder Mystery Web Game",
  description: "A team-based cyberpunk AI murder mystery game. Solve 'The Ghost in the Model' before the timer expires!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cyber-bg text-slate-100 min-h-screen relative flex flex-col font-mono selection:bg-cyber-cyan selection:text-black antialiased">
        {/* Subtle Scanline Overlay */}
        <div className="fixed inset-0 crt-scanlines z-50 pointer-events-none opacity-40" />

        {/* Ambient Neon Radial Backgrounds */}
        <div className="fixed -top-40 -left-40 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-cyber-magenta/10 rounded-full blur-3xl pointer-events-none" />

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
