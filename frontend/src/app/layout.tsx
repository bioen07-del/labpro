import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LabPro - Система управления клеточными культурами",
  description: "Система управления клеточными культурами и банками биоматериалов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 w-full overflow-x-hidden`}>
        <Header />
        <AuthProvider>
          <main className="min-h-screen w-full">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
