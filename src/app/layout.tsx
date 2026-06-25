import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "SproutMap AI",
  description: "Turn conversations into living maps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
