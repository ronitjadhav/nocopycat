import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoCopyCat - Smart Duplicate-Free Lists",
  description:
    "Create and manage duplicate-free lists with style. NoCopyCat features a bold neo-brutalist design with smart duplicate prevention, batch processing, and seamless import/export functionality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
