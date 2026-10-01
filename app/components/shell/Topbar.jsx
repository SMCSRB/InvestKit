'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import { Button, Popover } from '@/app/components/ui/primitives';
import { AnimatedNumber, burstCoins } from '@/app/components/ui/motion';
import { endSession } from '@/app/lib/session';
import { useTheme } from '@/app/context/ThemeContext';

const fmtCoins = (v) => Math.round(v).toLocaleString('fr-FR');

function Notifications({ notif, onRead }) {
  return (
    <Popover
      trigger={({ toggle, open }) => (
        <span className="ik-bell">
          <Button variant="secondary" icon="bell" onClick={toggle} aria-expanded={open} aria-haspopup="true" aria-label={`Notifications${notif.unread ? `, ${notif.unread} non lues` : ''}`} />
          {notif.unread > 0 && <span className="ik-badge-count" aria-hidden="true">{notif.unread > 9 ? '9+' : notif.unread}</span>}
        </span>
      )}
    >
      {({ close }) => (
        <div className="ik-notif">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 8px' }}>
            <strong>Notifications</strong>
            {notif.unread > 0 && <button type="button" className="ik-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={onRead}>Tout marquer comme lu</button>}
          </div>
          {notif.notifications.length === 0 && <p className="ik-muted" style={{ padding: '8px 12px 14px', margin: 0 }}>Rien de nouveau pour le moment.</p>}
          {notif.notifications.map((n) => {
            const body = (
              <>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </>
            );
            return n.link && n.link.startsWith('/') && !n.link.startsWith('//') ? (
              <Link key={n.id} href={n.link} className="ik-notif__item" data-unread={!n.read} onClick={close}>{body}</Link>
            ) : (
              <div key={n.id} className="ik-notif__item" data-unread={!n.read}>{body}</div>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function ProfileMenu({ user, theme, onToggleTheme }) {
  const router = useRouter();
  const name = user?.username || user?.firstName || 'Mon compte';
  const logout = async () => {
    await endSession();
    router.push('/');
  };
  return (
    <Popover
      trigger={({ toggle, open }) => (
        <button type="button" className="ik-profile" onClick={toggle} aria-expanded={open} aria-haspopup="true">
          <span className="ik-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
          <span className="ik-profile__name">{name}</span>
          <Icon name="chevronDown" size={16} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div style={{ padding: '8px 12px 10px' }}>
            <strong style={{ display: 'block' }}>{name}</strong>
            <span className="ik-muted">{user?.hasProAccess ? 'Plan Pro' : 'Plan gratuit'}</span>
          </div>
          <div className="ik-menu__sep" />
          <Link href="/profile" className="ik-menu__item" onClick={close}><Icon name="user" size={18} />Mon profil</Link>
          <Link href="/support" className="ik-menu__item" onClick={close}><Icon name="help" size={18} />Aide et support</Link>
          <button type="button" className="ik-menu__item" onClick={() => { onToggleTheme(); }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</button>
          <div className="ik-menu__sep" />
          <button type="button" className="ik-menu__item" onClick={logout}><Icon name="logout" size={18} />Se déconnecter</button>
        </>
      )}
    </Popover>
  );
}

export default function Topbar({ data, theme, onToggleTheme, onOpenSearch, onOpenMenu }) {
  const { user, wallet, notif, claimDaily, markAllRead } = data;
  const balanceRef = useRef(null);
  const rewardRef = useRef(null);
  const [msg, setMsg] = useState('');
  const busyRef = useRef(false);
  const { motionEnabled } = useTheme();
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const reward = async () => {
    if (!wallet || busyRef.current) return;
    if (!wallet.canClaimToday) {
      setMsg(`Récompense du jour déjà récupérée. Série en cours : ${wallet.dailyStreak} jour${wallet.dailyStreak > 1 ? 's' : ''}.`);
      return;
    }
    busyRef.current = true;
    try {
      const r = await claimDaily();
      if (motionEnabled) burstCoins(rewardRef.current, balanceRef.current);
      setMsg(`+${r.reward} InvestCoins ! Série : ${r.newStreak} jour${r.newStreak > 1 ? 's' : ''}.`);
    } catch (e) {
      setMsg(e.message);
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="ik-topbar" role="banner">
      <Button variant="ghost" icon="menu" className="ik-mobile-only" onClick={onOpenMenu} aria-label="Ouvrir le menu" aria-controls="ik-sidebar" />
      <span className="ik-topbar__label">InvestCoins</span>
      <Link href="/banque" className="ik-balance" ref={balanceRef} aria-label={wallet ? `Solde : ${fmtCoins(wallet.balance)} InvestCoins` : 'Solde indisponible'}>
        <span className="ik-balance__coin" aria-hidden="true" />
        {wallet ? <AnimatedNumber value={wallet.balance} format={fmtCoins} /> : <span className="ik-num">–</span>}
      </Link>
      <span ref={rewardRef} className="ik-quick" style={{ display: 'inline-flex', gap: 8 }}>
        <Button variant="primary" icon="gift" onClick={reward} className={`ik-rewardbtn ${wallet?.canClaimToday ? 'is-ready' : ''}`} aria-label={wallet?.canClaimToday ? 'Récupérer la récompense du jour' : 'Récompense du jour et série'} title={wallet?.canClaimToday ? 'Récupérer la récompense du jour' : `Série : ${wallet?.dailyStreak ?? 0} jour(s)`} />
        <Button variant="secondary" icon="arrowUpRight" href="/crypto" aria-label="Investir : marché Crypto" title="Investir" />
        <Button variant="secondary" icon="swap" href="/banque" aria-label="Banque : prêts et échéances" title="Banque" />
      </span>
      {wallet && wallet.dailyStreak > 0 && (
        <span className="ik-chip ik-quick" title="Série de jours consécutifs" style={{ gap: 4 }}><Icon name="flame" size={14} />{wallet.dailyStreak}</span>
      )}
      <span className="ik-topbar__spacer" />
      <button type="button" className="ik-search" onClick={onOpenSearch} aria-label="Rechercher (Ctrl ou Commande + K)">
        <Icon name="search" size={18} />
        <span className="ik-search__text">Rechercher…</span>
        <kbd className="ik-kbd">Ctrl K</kbd>
      </button>
      <Notifications notif={notif} onRead={markAllRead} />
      <ProfileMenu user={user} theme={theme} onToggleTheme={onToggleTheme} />
      <div role="status" aria-live="polite" className="ik-sr-only">{msg}</div>
      {msg && (
        <div className="ik-menu" style={{ top: 'calc(100% + 6px)', left: 20, minWidth: 0, maxWidth: 'calc(100vw - 40px)', fontSize: 'var(--ik-fs-sm)', fontWeight: 600, padding: '10px 14px' }}>
          {msg}
        </div>
      )}
    </div>
  );
}
