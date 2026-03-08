import { Lora, Inter } from 'next/font/google';
import '@/styles/globals.css';
import ThemeWrapper from '@/components/theme-wrapper';

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'ReadFlow',
  description: 'Vietnamese web novel reader with TTS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${lora.variable} ${inter.variable}`}>
      <body className="antialiased">
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
