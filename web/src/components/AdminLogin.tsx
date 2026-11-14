'use client';

import { useState, useRef, useEffect } from 'react';

export default function AdminLogin({ onLogin }: { onLogin: (pw: string) => Promise<boolean> }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    setBusy(true);
    const ok = await onLogin(value);
    setBusy(false);
    if (!ok) {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0B0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
        .shake { animation: shakeX 0.4s ease forwards; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gtl-logo.svg"
            alt="Gia Tinh Lam"
            width={56}
            height={66}
            style={{ display: 'block', height: 56, width: 'auto', margin: '0 auto' }}
          />
          <p
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#8A8A8A',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 16,
            }}
          >
            Admin Access
          </p>
        </div>

        <div className={shake ? 'shake' : ''}>
          <div
            style={{
              border: `1px solid ${error ? '#5a2a2a' : '#262626'}`,
              background: '#121212',
              padding: '32px 32px 28px',
              transition: 'border-color 0.3s',
            }}
          >
            <label
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#8A8A8A',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 12,
              }}
            >
              Passphrase
            </label>
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}
              placeholder="············"
              style={{
                width: '100%',
                background: '#1C1C1C',
                border: `1px solid ${error ? '#5a2a2a' : '#262626'}`,
                outline: 'none',
                padding: '14px 16px',
                fontFamily: 'JetBrains Mono',
                fontSize: 16,
                color: '#F4F4F0',
                letterSpacing: '0.2em',
                transition: 'border-color 0.3s',
                cursor: 'text',
                boxSizing: 'border-box',
              }}
              autoComplete="off"
            />
            {error && (
              <p
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: '#8A4040',
                  letterSpacing: '0.12em',
                  margin: '10px 0 0',
                  textTransform: 'uppercase',
                }}
              >
                ACCESS DENIED — INVALID PASSPHRASE
              </p>
            )}
            <button
              onClick={submit}
              disabled={busy}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '14px',
                background: '#F4F4F0',
                border: 'none',
                color: '#0B0B0B',
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.2s',
                opacity: busy ? 0.7 : 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ccc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F4F4F0')}
            >
              {busy ? 'Checking…' : 'Enter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
