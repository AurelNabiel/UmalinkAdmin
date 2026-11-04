import './globals.css';

export const metadata = {
  title: 'Umalink - Dashboard Pengurus',
  description: 'Panel admin Umalink',
  icons: { icon: '/umalink-logo.png', apple: '/umalink-logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
