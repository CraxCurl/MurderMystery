import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MURDLE: Solve The Murder in the Model",
  description: "A team-based mystery booklet puzzle. Deduce who committed the murder, with what weapon, and what motive!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#fbfbf9] text-black min-h-screen relative flex flex-col font-mono selection:bg-[#A30B37] selection:text-white antialiased">
        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
