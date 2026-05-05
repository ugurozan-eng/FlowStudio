import { Suspense } from "react";
import { VideoProvider } from "@/context/VideoContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata = {
  title: "StudioFlow - YouTube Production Studio",
  description: "Manage your YouTube video production with AI",
};

// Loading skeleton component
function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: '#ff0055',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
        Yükleniyor...
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <ErrorBoundary>
          <LanguageProvider>
            <Suspense fallback={<LoadingFallback />}>
              <VideoProvider>
                {children}
              </VideoProvider>
            </Suspense>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
