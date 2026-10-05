import type { Metadata } from 'next';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/500.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import './globals.css';
import { ConfirmationProvider } from '@/components/ui/confirmation';
import { DemoProvider } from '@/features/demo/provider';
import { AppShell } from '@/components/layout/shell';
export const metadata: Metadata = {
  title: 'মেসখাতা — একসাথে থাকার হিসাব',
  description: 'আপনার মেসের মিল, জমা, খরচ ও মাসের নিষ্পত্তি — এক জায়গায়।',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>
        <ConfirmationProvider>
          <DemoProvider>
            <AppShell>{children}</AppShell>
          </DemoProvider>
        </ConfirmationProvider>
      </body>
    </html>
  );
}
