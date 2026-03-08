'use client';
// User menu: avatar + dropdown with sync status, sign out, delete account
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function UserMenu() {
  const { user, signOut, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

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
    position: 'absolute',
    top: '44px',
    right: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    minWidth: '180px',
    zIndex: 100,
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
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
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

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={menuStyle}>
            {/* User info */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)',
              fontSize: '13px', color: 'var(--text-secondary)' }}>
              {user.displayName}
            </div>
            {/* Sync status (static indicator) */}
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
