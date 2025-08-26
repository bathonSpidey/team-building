import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Trust — Escape Room",
  description: "A cooperative trust-building virtual escape room",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased">
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-3xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
