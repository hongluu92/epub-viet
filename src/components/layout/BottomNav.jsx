import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const navItems = [
  { to: '/', label: 'Trang chủ', icon: '🏠', end: true },
  { to: '/library', label: 'Thư viện', icon: '📚' },
  { to: '/favorites', label: 'Yêu thích', icon: '❤️' },
  { to: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
