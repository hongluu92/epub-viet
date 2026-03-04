import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Trang chủ', icon: '🏠', end: true },
  { to: '/library', label: 'Thư viện', icon: '📚' },
  { to: '/favorites', label: 'Yêu thích', icon: '❤️' },
  { to: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

function UserAvatar({ user }) {
  if (!user) return null;
  const initials = (user.displayName || user.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className={styles.avatar}>
      {user.photoURL ? (
        <img src={user.photoURL} alt={user.displayName} className={styles.avatarImg} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, isAuthenticated, signIn, signOut } = useAuth();

  return (
    <nav className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>📖</div>
        <span className={styles.logoText}>ReadFlow</span>
      </div>

      {/* Nav items */}
      <div className={styles.navList}>
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer: user info + sign in/out */}
      <div className={styles.footer}>
        {isAuthenticated && user ? (
          <div className={styles.userCard}>
            <UserAvatar user={user} />
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.displayName || 'Người dùng'}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
        ) : null}
        <button
          className={isAuthenticated ? styles.signOutBtn : styles.signInBtn}
          onClick={isAuthenticated ? signOut : signIn}
        >
          {isAuthenticated ? '🚪 Đăng xuất' : '🔑 Đăng nhập'}
        </button>
      </div>
    </nav>
  );
}
