import './globals.css';

export const metadata = {
  title: 'Umalink — Dashboard Pengurus',
  description: 'Panel admin Umalink',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
