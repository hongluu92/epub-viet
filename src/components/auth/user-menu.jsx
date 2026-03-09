'use client';
// User menu: avatar + dropdown with sync status, sign out, delete account
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function UserMenu() {
  const { user, signOut, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 });
  const btnRef = useRef(null);

  if (!user) return null;

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
    }
    setOpen((o) => !o);
  }

  async function handleDelete() {
    if (!confirm('Xác nhận xóa tài khoản? Dữ liệu sẽ không thể khôi phục.')) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      alert('Xóa tài khoản thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  }

  const menuStyle = {
    position: 'fixed',
    top: menuPos.top,
    right: menuPos.right,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    minWidth: '180px',
    zIndex: 9999,
    overflow: 'hidden',
  };

  const itemStyle = {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--text)',
    fontFamily: 'var(--font-inter)',
  };

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Avatar button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        aria-label="Menu tài khoản"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || ''} width={34} height={34}
            style={{ borderRadius: '50%', border: '2px solid var(--accent)' }} />
        ) : (
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 600,
          }}>
            {user.displayName?.[0] ?? 'U'}
          </div>
        )}
      </button>

      {/* Dropdown - rendered with fixed positioning to escape parent overflow */}
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div style={menuStyle}>
            {/* User info */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)',
              fontSize: '13px', color: 'var(--text-secondary)' }}>
              {user.displayName}
            </div>
            {/* Sync status */}
            <div style={{ ...itemStyle, cursor: 'default', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span style={{ color: '#22c55e', marginRight: 6 }}>●</span>Đồng bộ
            </div>
            {/* Sign out */}
            <button style={itemStyle} onClick={() => { setOpen(false); signOut(); }}>
              Đăng xuất
            </button>
            {/* Delete account */}
            <button
              style={{ ...itemStyle, color: '#ef4444', borderTop: '1px solid var(--border)' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Đang xóa...' : 'Xóa tài khoản'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
