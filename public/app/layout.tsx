import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MKD Účetnictví",
  description: "Podklady pro účetnictví - MKD Enterprise, s.r.o.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
