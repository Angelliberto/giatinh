'use client';

import Admin from '@/components/Admin';
import AdminLogin from '@/components/AdminLogin';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { authed, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
          color: '#8A8A8A',
          letterSpacing: '0.12em',
        }}
      >
        LOADING…
      </div>
    );
  }

  if (!authed) return <AdminLogin onLogin={login} />;
  return <Admin onLogout={() => void logout()} />;
}
