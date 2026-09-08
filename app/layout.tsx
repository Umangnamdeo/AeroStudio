import type {Metadata} from 'next';
import { Syne, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Automotive Aerodynamics Platform',
  description: 'Professional browser-based automotive virtual wind tunnel and aerodynamic simulation platform featuring WebGPU/WebGL acceleration, adaptive RK2 streamline integration, moving ground plane rolling road simulation, and dynamic procedural aeroacoustics.',
  openGraph: {
    title: 'Automotive Aerodynamics Platform',
    description: 'Professional browser-based automotive virtual wind tunnel and aerodynamic simulation platform featuring WebGPU/WebGL acceleration, adaptive RK2 streamline integration, moving ground plane rolling road simulation, and dynamic procedural aeroacoustics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Automotive Aerodynamics Platform',
    description: 'Professional browser-based automotive virtual wind tunnel and aerodynamic simulation platform featuring WebGPU/WebGL acceleration, adaptive RK2 streamline integration, moving ground plane rolling road simulation, and dynamic procedural aeroacoustics.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body 
        className={`${syne.variable} ${jetbrainsMono.variable} ${inter.variable} bg-[#0b0b0c] text-[#ececed] font-sans antialiased overflow-hidden selection:bg-[#3b82f6] selection:text-white`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

