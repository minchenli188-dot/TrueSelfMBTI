import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Space Grotesk - Modern geometric font for body text
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// JetBrains Mono - For code and technical elements
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Playfair Display - Elegant display font for headings
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MBTI Assistant | 通过对话发现你的性格类型",
  description:
    "一个 AI 驱动的 MBTI 性格测评应用，通过自然对话而非选择题来深入理解你的性格。",
  keywords: [
    "MBTI",
    "性格测试",
    "AI",
    "人格分析",
    "自我发现",
    "16型人格",
    "荣格",
    "认知功能",
  ],
  authors: [{ name: "MBTI Assistant Team" }],
  openGraph: {
    title: "MBTI Assistant | 发现你的真实自我",
    description:
      "告别无聊的选择题，通过自然对话让 AI 揭示你独特的 MBTI 类型。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} antialiased bg-background text-foreground min-h-screen`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
