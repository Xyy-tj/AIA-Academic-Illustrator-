import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { FaviconUpdater } from "@/components/FaviconUpdater";
import { AnnouncementModal } from "@/components/announcement/AnnouncementModal";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Academic Illustrator | AI-Powered Scientific Diagrams",
  description: "Automate the creation of CVPR/NeurIPS standard academic diagrams using AI. Transform your paper abstracts into professional visual schemas.",
  keywords: ["academic", "diagram", "AI", "CVPR", "NeurIPS", "illustration", "scientific"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans antialiased`}
      >
        <FaviconUpdater />
        <AnnouncementModal />
        {children}
        <SiteFooter />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
