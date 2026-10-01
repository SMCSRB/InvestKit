'use client';

import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import { Button, EmptyState, Tabs } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import OverviewTab from './OverviewTab';
import MarketTab from './MarketTab';
import HistoryChart from '@/app/components/HistoryChart';
import SocialHub from '@/app/components/social/SocialHub';

import { PRICES, formatEuro } from '@/app/lib/plans';
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HelpTip from '@/app/components/HelpTip';
import PortfolioRisk from '@/app/components/PortfolioRisk';
import OnboardingChecklist from '@/app/components/OnboardingChecklist';
import { useEducationProgress } from '@/app/context/EducationContext';
import { useUser } from '@/app/context/UserContext';
import { educationDomains } from '@/data/education';

// Transparence d'une couleur quelconque (hexadécimale ou variable de design).
const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// useSearchParams exige une limite Suspense (lecture de ?tab=…).
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { progress, isDomainCompleted, getDomainProgress } = useEducationProgress();
  const { user: userData, setUser, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTabState] = useState('overview');
  const [socialTab, setSocialTab] = useState('friends');
  const setActiveTab = useCallback((t) => {
    setActiveTabState(t);
    try { window.history.replaceState(null, '', t === 'overview' ? '/dashboard' : `/dashboard?tab=${t}`); } catch { /* ignore */ }
  }, []);
  // Les liens du menu latéral (?tab=trading, ?tab=settings…) ouvrent l'onglet demandé, y compris quand le tableau de bord est déjà ouvert.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  useEffect(() => {
    // « risk » (ancien onglet vide) mène à l'analyse de risque réelle, qui vit dans le simulateur.
    const target = tabParam === 'risk' ? 'trading' : tabParam === 'activity' ? 'friends' : (tabParam || 'overview');
    if (['overview', 'market', 'trading', 'education', 'friends', 'notifications', 'settings'].includes(target)) setActiveTabState(target);
  }, [tabParam]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalTab, setNewsModalTab] = useState('news');
  const { theme: globalTheme, toggleTheme: toggleGlobalTheme } = useTheme();
  const isDarkMode = globalTheme === 'dark';
  const [settingsTab, setSettingsTab] = useState('general');
  // 2FA - configuration réelle (backend TOTP)
  const [twoFAModal, setTwoFAModal] = useState(null); // null | 'setup' | 'verify' | 'backup-codes' | 'disable'
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACodeInput, setTwoFACodeInput] = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState([]);
  const [twoFADisablePassword, setTwoFADisablePassword] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  // Abonnement Stripe
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  // InvestCoins (économie virtuelle)
  const [coinsBalance, setCoinsBalance] = useState(null);
  const [coinsStreak, setCoinsStreak] = useState(0);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  // Simulateur Bourse (trading accéléré)
  const [tradingDomain, setTradingDomain] = useState('stocks');
  const [tradingDomains, setTradingDomains] = useState([]);
  const [tradingAssets, setTradingAssets] = useState([]);
  const [tradingPortfolio, setTradingPortfolio] = useState(null);
  const [tradingSelectedAsset, setTradingSelectedAsset] = useState('LVMH');
  const [tradingQuantity, setTradingQuantity] = useState(1);
  const [tradingAccount, setTradingAccount] = useState('pea'); // enveloppe d'achat en Bourse : PEA ou compte-titres
  const [tradingQuote, setTradingQuote] = useState(null);     // aperçu (frais, impôt) affiché avant de vendre
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradingError, setTradingError] = useState('');
  const [tradingLoaded, setTradingLoaded] = useState(false);
  const [showDomainChooser, setShowDomainChooser] = useState(false);
  const [tradingBoard, setTradingBoard] = useState(null);
  const [tradingBoardYear, setTradingBoardYear] = useState(null); // null = mon année simulée
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fullName, setFullName] = useState('Investisseur');
  const [email, setEmail] = useState('jean.dupont@example.com');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [hideStats, setHideStats] = useState(false);
  const [shareProgress, setShareProgress] = useState(true);
  const [preferredDomain, setPreferredDomain] = useState('crypto');
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [academyNotifications, setAcademyNotifications] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsTab, setFriendsTab] = useState('friends'); // friends, search, pending, leaderboard, messages, guildes
  const [selectedFriendProfile, setSelectedFriendProfile] = useState(null); // Pour voir le profil d'un ami
  const [selectedChatFriend, setSelectedChatFriend] = useState(null); // Pour le chat avec un ami
  const [chatMessages, setChatMessages] = useState({}); // { friendCode: [messages] }
  const [messageInput, setMessageInput] = useState('');
  const [selectedGuilde, setSelectedGuilde] = useState(null); // Pour voir les détails d'une guilde
  const [selectedGuildeTab, setSelectedGuildeTab] = useState('info'); // info, members, chat
  const [userGuildes, setUserGuildes] = useState([]); // Guildes auxquelles l'utilisateur a rejoint
  const [guildMessage, setGuildMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [guildChatInput, setGuildChatInput] = useState(''); // Message input pour le chat de guilde
  const [memberActionMenu, setMemberActionMenu] = useState(null); // { guildId, memberId } pour afficher menu d'action
  const [roleChangeMenu, setRoleChangeMenu] = useState(null); // { guildId, memberId } pour changer de rôle
  const [showConfetti, setShowConfetti] = useState(false); // Pour l'animation confetti
  const [unlockedAchievements, setUnlockedAchievements] = useState([]); // Achievements débloqués
  const [newAchievement, setNewAchievement] = useState(null); // Achievement en cours de notification
  const [guildesCreatedCount, setGuildesCreatedCount] = useState(0); // Nombre de guildes créées
  const [leaderboardTab, setLeaderboardTab] = useState('global-guilds'); // Tab du classement
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all-time'); // Période du classement : week, month, all-time
  const [leaderboardDomain, setLeaderboardDomain] = useState('all'); // Domaine : all, crypto, stocks, realestate, bonds
  const [leaderboardLevel, setLeaderboardLevel] = useState('all'); // Niveau : all, 1-3, 4-6, 7-9, 10+
  const [selectedLeaderboardUser, setSelectedLeaderboardUser] = useState(null); // Utilisateur du classement sélectionné
  const [selectedLeaderboardGuild, setSelectedLeaderboardGuild] = useState(null); // Guilde du classement sélectionnée
  const [guildes, setGuildes] = useState([]);
  const [showCreateGuilde, setShowCreateGuilde] = useState(false);
  const [newGuildeName, setNewGuildeName] = useState('');
  const [newGuildeDesc, setNewGuildeDesc] = useState('');
  const [guildeRestrictions, setGuildeRestrictions] = useState({
    minLevel: 1,
    minXP: 0,
    requiredBadges: [],
    domainRequirements: {}, // { 'crypto': 50, 'stocks': 30 }
  });

  // Guild search & filter states
  const [guildeSearchQuery, setGuildeSearchQuery] = useState('');
  const [guildeFilterMinLevel, setGuildeFilterMinLevel] = useState(0);
  const [guildeFilterDomain, setGuildeFilterDomain] = useState('all');

  // Notifications & Activity Feed
  const [activeSection, setActiveSection] = useState('dashboard'); // dashboard, notifications, activity
  // Notifications RÉELLES du serveur (événements de la banque, de l'immobilier, de la sécurité du compte…) ; voir loadNotifications.
  const [notifications, setNotifications] = useState([]);
  // Fil d'activité : aucune donnée fictive. Il se remplira quand les amis auront des événements réels côté serveur.
  const [activityFeed, setActivityFeed] = useState([]);

  const [activityFilter, setActivityFilter] = useState('all'); // all, level_up, achievement, guild, leaderboard, investment

  // Guild Events & Announcements
  const [guildEvents, setGuildEvents] = useState([
    { id: 1, guildId: 'crypto-masters', title: '🎯 Défi Crypto Hebdo', description: 'Investissez 1000€ en crypto et battez les autres membres', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 604800000), participants: 12, reward: '500 XP' },
    { id: 2, guildId: 'immobilier-pro', title: '🏠 Tournoi Immobilier', description: 'Simulez l\'achat d\'un bien immobilier avec le meilleur ROI', startDate: new Date(Date.now() + 172800000), endDate: new Date(Date.now() + 1209600000), participants: 8, reward: '1000 XP' },
    { id: 3, guildId: 'crypto-masters', title: '💰 Challenge Portefeuille', description: 'Rebalancez votre portefeuille et gagnez des points', startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 259200000), participants: 25, reward: '300 XP' },
    { id: 4, guildId: 'crypto-masters', title: '📊 Analyse Technique Marathon', description: 'Analysez les patterns sur 5 paires différentes et partagez vos prédictions', startDate: new Date(Date.now() + 345600000), endDate: new Date(Date.now() + 432000000), participants: 18, reward: '750 XP' },
    { id: 5, guildId: 'immobilier-pro', title: '🔍 Visite Virtuelle d\'Immeubles', description: 'Tour virtuel de 10 propriétés prestigieuses et évaluation de leur potentiel', startDate: new Date(Date.now() + 259200000), endDate: new Date(Date.now() + 604800000), participants: 22, reward: '600 XP' },
  ]);
  const [guildAnnouncements, setGuildAnnouncements] = useState([]);

  // 5. LEADERBOARD GUILDES - Ranking des membres
  const [guildLeaderboards, setGuildLeaderboards] = useState({});

  // 6. SYSTÈME DE POINTS GUILDE - Trésor/points partagés
  const [guildTreasures, setGuildTreasures] = useState({});

  // 1. REAL-TIME NOTIFICATIONS - Système en temps réel
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const notificationIntervalRef = useRef(null);

  // 2. CHAT GUILDES AMÉLIORÉ - Sidebar chat intégré
  const [selectedGuildChat, setSelectedGuildChat] = useState(null);
  const [guildChatMessages, setGuildChatMessages] = useState({});

  // 3. SYSTÈME DE NOTIFICATIONS PUSH - Alertes pop-up
  const [pushNotifications, setPushNotifications] = useState([]);

  // Badge System - Rarity levels: common, rare, very_rare, unique
  // Enhanced with statistics, XP value, and rarity percentages
  const badgeDefinitions = {
    'first_step': { name: 'Premier Pas', emoji: '👶', rarity: 'common', requirement: 'level:1', xp: 50, rarity_percent: 98.5, category: 'milestone', description: 'Débuter ton parcours d\'investisseur' },
    'crypto_novice': { name: 'Novice Crypto', emoji: '₿', rarity: 'rare', requirement: 'course:crypto', xp: 150, rarity_percent: 45.2, category: 'education', description: 'Première leçon de crypto complétée' },
    'stock_master': { name: 'Maître Boursier', emoji: '📈', rarity: 'rare', requirement: 'course:stocks', xp: 150, rarity_percent: 38.7, category: 'education', description: 'Maîtriser la bourse et les PEA' },
    'real_estate_pro': { name: 'Pro Immobilier', emoji: '🏠', rarity: 'rare', requirement: 'course:realestate', xp: 150, rarity_percent: 32.1, category: 'education', description: 'Devenir expert en immobilier' },
    'investment_guru': { name: 'Gourou Investisseur', emoji: '🧠', rarity: 'very_rare', requirement: 'level:10', xp: 300, rarity_percent: 22.5, category: 'milestone', description: 'Atteindre le niveau 10' },
    'crypto_master': { name: 'Maître Crypto', emoji: '👑', rarity: 'very_rare', requirement: 'level:15', xp: 400, rarity_percent: 12.8, category: 'milestone', description: 'Atteindre le niveau 15' },
    'portfolio_genius': { name: 'Génie Portefeuille', emoji: '💎', rarity: 'very_rare', requirement: 'level:20', xp: 500, rarity_percent: 8.3, category: 'milestone', description: 'Atteindre le niveau 20' },
    'legend': { name: 'Légende Investisseur', emoji: '⭐', rarity: 'unique', requirement: 'level:50', xp: 1000, rarity_percent: 0.5, category: 'milestone', description: 'Atteindre le niveau 50 - Légende !' },
    'founder': { name: 'Fondateur', emoji: '👑', rarity: 'unique', requirement: 'event:founder', xp: 750, rarity_percent: 0.1, category: 'event', description: 'Membre fondateur d\'InvestKit' },
    'event_champion': { name: 'Champion Événement', emoji: '🏆', rarity: 'very_rare', requirement: 'event:win', xp: 350, rarity_percent: 5.2, category: 'event', description: 'Gagnant d\'un événement' },
    'spring_collector': { name: 'Collecteur Printemps', emoji: '🌸', rarity: 'rare', requirement: 'seasonal:spring', xp: 200, rarity_percent: 25.0, category: 'seasonal', description: 'Actif au printemps', season: 'spring' },
    'summer_master': { name: 'Maître Été', emoji: '☀️', rarity: 'very_rare', requirement: 'seasonal:summer', xp: 350, rarity_percent: 12.0, category: 'seasonal', description: 'Maître de l\'été', season: 'summer' },
    'autumn_warrior': { name: 'Guerrier Automne', emoji: '🍂', rarity: 'rare', requirement: 'seasonal:autumn', xp: 200, rarity_percent: 20.0, category: 'seasonal', description: 'Combattant d\'automne', season: 'autumn' },
    'winter_champion': { name: 'Champion Hiver', emoji: '❄️', rarity: 'very_rare', requirement: 'seasonal:winter', xp: 350, rarity_percent: 18.0, category: 'seasonal', description: 'Roi de l\'hiver', season: 'winter' },
    'night_trader': { name: 'Trader Nocturne', emoji: '🌙', rarity: 'rare', requirement: 'secret:night', xp: 200, rarity_percent: 8.5, category: 'secret', description: 'Trader qui travaille la nuit' },
    'lucky_seven': { name: 'Sept Chanceuse', emoji: '7️⃣', rarity: 'very_rare', requirement: 'secret:lucky', xp: 300, rarity_percent: 3.2, category: 'secret', description: 'Un hasard fortuné s\'est produit' },
    'speedster': { name: 'Rapide comme l\'éclair', emoji: '⚡', rarity: 'rare', requirement: 'secret:speed', xp: 250, rarity_percent: 6.8, category: 'secret', description: 'Atteindre 3 niveaux en un jour' },
    'million_club': { name: 'Club Million', emoji: '💰', rarity: 'very_rare', requirement: 'secret:wealth', xp: 400, rarity_percent: 4.1, category: 'secret', description: 'Simuler un million en gains' },
    'perfectionist': { name: 'Perfectionniste', emoji: '✨', rarity: 'unique', requirement: 'secret:perfect', xp: 600, rarity_percent: 0.3, category: 'secret', description: 'Compléter tous les cours au 100%' },
    'mystery_badge': { name: '🔮 Mystère', emoji: '🔮', rarity: 'unique', requirement: 'secret:mystery', xp: 750, rarity_percent: 1.5, category: 'secret', description: 'Un secret attendant sa révélation' },
  };

  const [userBadges, setUserBadges] = useState([]);
  const [isPremium, setIsPremium] = useState(true);
  const [selectedDisplayBadges, setSelectedDisplayBadges] = useState(['first_step', 'crypto_novice']); // Max 3 badges to display
  const [badgeBackgroundColor, setBadgeBackgroundColor] = useState('linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 10%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 100%)');
  const [userBio, setUserBio] = useState('Investisseur passionné en crypto et finance');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileMenuTab, setProfileMenuTab] = useState('badges'); // badges, bio
  const [bioEditInput, setBioEditInput] = useState('Investisseur passionné en crypto et finance');
  const [baggeBackgroundInput, setBaggeBackgroundInput] = useState('');
  // Level tracking - synchronized with localStorage
  const [userLevel, setUserLevel] = useState(1); // Default 1, loads from localStorage
  const [dailyXP, setDailyXP] = useState(Math.floor(Math.random() * 500) + 150); // Random XP 150-650
  const [totalXP, setTotalXP] = useState((userLevel || 1) * 1000 + dailyXP);
  const [xpToNextLevel, setXpToNextLevel] = useState(1000);
  const [recentLevelUp, setRecentLevelUp] = useState(false);
  const [particles, setParticles] = useState([]);
  const [isMilestone, setIsMilestone] = useState((userLevel || 1) % 5 === 0);

  // NEW: Enhanced Badge System States
  const [badgeUnlockToasts, setBadgeUnlockToasts] = useState([]); // Toast notifications for new badges
  const [badgeConfetti, setBadgeConfetti] = useState([]); // Confetti particles for celebrations
  const [badgeDateObtained, setBadgeDateObtained] = useState({}); // { badgeId: timestamp }
  const [badgeUnlockProgress, setBadgeUnlockProgress] = useState({}); // Progress for near-unlock badges
  const [showBadgeAlbum, setShowBadgeAlbum] = useState(false); // Badge collection album modal
  const [badgeAlbumFilter, setBadgeAlbumFilter] = useState('all'); // all, obtained, locked, seasonal, secret
  const [hoveredBadge, setHoveredBadge] = useState(null); // For flip effect and interactions
  const [soundEnabled, setSoundEnabled] = useState(true); // Sound effects toggle
  const [badgeFlipStates, setBadgeFlipStates] = useState({}); // Track which badges are flipped
  const [pinnedBadges, setPinnedBadges] = useState([]); // Pinned favorite badges (max 3)
  const [badgeCustomTitles, setBadgeCustomTitles] = useState({}); // Custom titles for badges (premium)
  const [badgeAuraColors, setBadgeAuraColors] = useState({}); // Custom aura colors (premium)
  const [badgeShowcaseTab, setBadgeShowcaseTab] = useState('rarity'); // rarity, newest, pinned

  // ============ 2FA (TOTP réel, backend) ============
  const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const startTwoFASetup = async () => {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la configuration');
      setTwoFAQrCode(data.qrCode);
      setTwoFASecret(data.secret);
      setTwoFACodeInput('');
      setTwoFAModal('setup');
    } catch (err) {
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const confirmTwoFASetup = async () => {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ code: twoFACodeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      setTwoFABackupCodes(data.backupCodes);
      setTwoFAModal('backup-codes');
      setUser((prev) => ({ ...prev, enable2FA: true }));
    } catch (err) {
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const confirmTwoFADisable = async () => {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ password: twoFADisablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mot de passe incorrect');
      setTwoFAModal(null);
      setTwoFADisablePassword('');
      setUser((prev) => ({ ...prev, enable2FA: false }));
    } catch (err) {
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const closeTwoFAModal = () => {
    setTwoFAModal(null);
    setTwoFAError('');
    setTwoFACodeInput('');
    setTwoFADisablePassword('');
  };

  // ============ Abonnement Stripe ============
  const startCheckout = async (plan) => {
    setBillingError('');
    setBillingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du paiement');
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err.message);
      setBillingLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setBillingError('');
    setBillingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-portal-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'ouverture du portail');
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err.message);
      setBillingLoading(false);
    }
  };

  // ============ InvestCoins (économie virtuelle) ============
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/economy/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCoinsBalance(data.balance);
          setCoinsStreak(data.dailyStreak);
          setCanClaimDaily(data.canClaimToday);
        }
      })
      .catch((err) => console.error('Erreur récupération solde InvestCoins:', err));
  }, []);

  const claimDailyCoins = async () => {
    setClaimingDaily(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/economy/daily-reward`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoinsBalance(data.balance);
      setCoinsStreak(data.newStreak);
      setCanClaimDaily(false);
      triggerConfetti();
    } catch (err) {
      console.error('Erreur réclamation quotidienne:', err);
    } finally {
      setClaimingDaily(false);
    }
  };

  // ============ Simulateur Bourse (trading accéléré) ============
  const loadTradingData = async (domain = tradingDomain) => {
    const token = getAuthToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const base = process.env.NEXT_PUBLIC_API_URL;
    try {
      const [domainsRes, assetsRes, portfolioRes] = await Promise.all([
        fetch(`${base}/trading/domains`, { headers }),
        fetch(`${base}/trading/assets?domain=${domain}`, { headers }),
        fetch(`${base}/trading/portfolio?domain=${domain}`, { headers }),
      ]);
      const domainsData = await domainsRes.json();
      const assetsData = await assetsRes.json();
      const portfolioData = await portfolioRes.json();
      if (domainsRes.ok) setTradingDomains(domainsData.domains);
      if (assetsRes.ok) {
        setTradingAssets(assetsData.assets);
        setTradingSelectedAsset((current) =>
          assetsData.assets.some((a) => a.symbol === current) ? current : assetsData.assets[0]?.symbol
        );
      }
      if (portfolioRes.ok) setTradingPortfolio(portfolioData);
      loadTradingBoard(domain);
    } catch (err) {
      console.error('Erreur chargement trading:', err);
    } finally {
      setTradingLoaded(true);
    }
  };

  const loadTradingBoard = async (domain = tradingDomain, year = tradingBoardYear) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const qs = `domain=${domain}${year ? `&year=${year}` : ''}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/leaderboard?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTradingBoard(data);
    } catch (err) {
      console.error('Erreur chargement classement:', err);
    }
  };

  // Choix UNIQUE du domaine gratuit : le serveur refuse tout changement ensuite.
  const chooseFreeDomain = async (domain) => {
    setTradingError('');
    setTradingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/set-free-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((prev) => ({ ...prev, freeDomain: domain }));
      setShowDomainChooser(false);
      await loadTradingData();
    } catch (err) {
      setTradingError(err.message);
    } finally {
      setTradingLoading(false);
    }
  };

  const changeTradingDomain = async (domain) => {
    if (domain === tradingDomain) return;
    setTradingError('');
    setTradingDomain(domain);
    setTradingBoardYear(null);
    setTradingQuantity(1);
    await loadTradingData(domain);
  };

  const tradingBuy = async () => {
    setTradingError('');
    setTradingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ domain: tradingDomain, symbol: tradingSelectedAsset, quantity: Number(tradingQuantity), account: tradingDomain === 'crypto' ? undefined : tradingAccount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTradingData();
    } catch (err) {
      setTradingError(err.message);
    } finally {
      setTradingLoading(false);
    }
  };

  // Aperçu d'une vente : frais et impôt calculés par le serveur ; la vente n'est exécutée qu'après confirmation.
  const tradingPreviewSell = async (pos) => {
    setTradingError('');
    setTradingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ domain: tradingDomain, side: 'sell', symbol: pos.symbol, quantity: pos.quantity, account: pos.account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTradingQuote({ ...data, symbol: pos.symbol, quantity: pos.quantity });
    } catch (err) {
      setTradingError(err.message);
    } finally {
      setTradingLoading(false);
    }
  };

  const tradingSell = async (symbol, quantity, account) => {
    setTradingError('');
    setTradingLoading(true);
    setTradingQuote(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ domain: tradingDomain, symbol, quantity, account }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTradingData();
    } catch (err) {
      setTradingError(err.message);
    } finally {
      setTradingLoading(false);
    }
  };

  const tradingAdvanceYear = async () => {
    setTradingError('');
    setTradingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/advance-year`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ domain: tradingDomain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTradingData();
      // Prêt sur portefeuille : appel de marge, vente forcée, intérêts impayés… affichés tels que calculés par le serveur.
      if (data.bankEvents?.length) setTradingError(data.bankEvents.map((e) => e.message).join(' '));
    } catch (err) {
      setTradingError(err.message);
    } finally {
      setTradingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trading' && !tradingLoaded) {
      loadTradingData();
    }
  }, [activeTab, tradingLoaded]);

  // ============ HELPER FUNCTIONS FOR BADGE SYSTEM ============

  // Play sound effect for badge unlock (if enabled)
  const playSound = useCallback((type = 'unlock') => {
    if (!soundEnabled) return;
    // Create audio context and play tone
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'unlock') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'flip') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    }
  }, [soundEnabled]);

  // Create confetti particles for celebration
  const createConfetti = useCallback((badgeId) => {
    const uniqueSetId = `${Date.now()}-${Math.random()}`;
    const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
      id: `${badgeId}-confetti-${i}-${uniqueSetId}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 1,
      color: ['var(--ik-warning)', 'var(--ik-warning)', 'var(--ik-warning)', '#ec4899', 'var(--ik-orchid)'][Math.floor(Math.random() * 5)],
    }));
    setBadgeConfetti(prev => [...prev, ...confettiPieces]);
    setTimeout(() => {
      setBadgeConfetti(prev => prev.filter(c => !confettiPieces.find(p => p.id === c.id)));
    }, 3000);
  }, []);

  // Show toast notification for badge unlock
  const showBadgeToast = useCallback((badgeId) => {
    const badge = badgeDefinitions[badgeId];
    if (!badge) return;

    const toastId = `toast-${badgeId}-${Date.now()}`;
    const toast = {
      id: toastId,
      badgeId,
      badgeName: badge.name,
      badgeEmoji: badge.emoji,
      rarity: badge.rarity,
      xp: badge.xp,
    };

    setBadgeUnlockToasts(prev => [...prev, toast]);
    playSound('unlock');
    createConfetti(badgeId);

    setTimeout(() => {
      setBadgeUnlockToasts(prev => prev.filter(t => t.id !== toastId));
    }, 4000);
  }, [badgeDefinitions, playSound, createConfetti]);

  // Unlock a new badge with all animations and effects
  const unlockBadge = useCallback((badgeId) => {
    if (userBadges.includes(badgeId)) return;

    setUserBadges(prev => [...prev, badgeId]);
    setBadgeDateObtained(prev => ({
      ...prev,
      [badgeId]: new Date().toISOString(),
    }));
    showBadgeToast(badgeId);
  }, [userBadges, showBadgeToast]);

  // Calculate progress for near-unlock badges
  const calculateBadgeProgress = useCallback(() => {
    const progress = {};
    Object.entries(badgeDefinitions).forEach(([badgeId, badge]) => {
      if (userBadges.includes(badgeId)) {
        progress[badgeId] = { current: 100, required: 100 };
        return;
      }

      const [type, value] = badge.requirement.split(':');

      if (type === 'level') {
        const required = parseInt(value);
        progress[badgeId] = {
          current: Math.min(userLevel, required),
          required,
          percent: Math.floor((Math.min(userLevel, required) / required) * 100),
        };
      } else if (type === 'course') {
        progress[badgeId] = {
          current: isDomainCompleted(value) ? 1 : 0,
          required: 1,
          percent: isDomainCompleted(value) ? 100 : 0,
        };
      } else if (type === 'seasonal' || type === 'event' || type === 'secret') {
        progress[badgeId] = { current: 0, required: 1, percent: 0 };
      }
    });
    setBadgeUnlockProgress(progress);
  }, [userLevel, userBadges, badgeDefinitions, isDomainCompleted]);

  // Toggle badge flip state
  const toggleBadgeFlip = useCallback((badgeId) => {
    setBadgeFlipStates(prev => ({
      ...prev,
      [badgeId]: !prev[badgeId],
    }));
    playSound('flip');
  }, [playSound]);

  // Get badge rarity color
  const getBadgeRarityColor = (rarity) => {
    const colors = {
      common: 'rgba(156, 163, 175, 0.2)',
      rare: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
      very_rare: 'color-mix(in srgb, var(--ik-orchid) 20%, transparent)',
      unique: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-warning) 30%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 30%, transparent) 100%)',
    };
    return colors[rarity] || colors.common;
  };

  // Get badge rarity border
  const getBadgeRarityBorder = (rarity) => {
    const borders = {
      common: '1px solid rgba(156, 163, 175, 0.3)',
      rare: '1px solid color-mix(in srgb, var(--ik-primary) 50%, transparent)',
      very_rare: '2px solid color-mix(in srgb, var(--ik-orchid) 60%, transparent)',
      unique: '2px solid color-mix(in srgb, var(--ik-warning) 80%, transparent)',
    };
    return borders[rarity] || borders.common;
  };

  // Pin/Unpin badge for showcase (max 3)
  const togglePinnedBadge = useCallback((badgeId) => {
    setPinnedBadges(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      } else if (prev.length < 3) {
        return [...prev, badgeId];
      }
      return prev;
    });
  }, []);

  // Get badges sorted by rarity for showcase
  const getShowcaseBadges = useCallback(() => {
    const rarityOrder = { unique: 0, very_rare: 1, rare: 2, common: 3 };
    const obtained = userBadges
      .map(id => ({ id, badge: badgeDefinitions[id], date: badgeDateObtained[id] }))
      .filter(b => b.badge);

    if (badgeShowcaseTab === 'rarity') {
      return obtained.sort((a, b) => rarityOrder[a.badge.rarity] - rarityOrder[b.badge.rarity]).slice(0, 6);
    } else if (badgeShowcaseTab === 'newest') {
      return obtained.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6);
    } else if (badgeShowcaseTab === 'pinned') {
      return pinnedBadges.map(id => ({
        id,
        badge: badgeDefinitions[id],
        date: badgeDateObtained[id],
      })).filter(b => b.badge);
    }
    return [];
  }, [userBadges, badgeDefinitions, badgeDateObtained, badgeShowcaseTab, pinnedBadges]);

  // Get badge rarity rank (1 = rarest)
  const getBadgeRarityRank = useCallback((badgeId) => {
    const badge = badgeDefinitions[badgeId];
    const rarityRanks = { unique: 1, very_rare: 2, rare: 3, common: 4 };
    return rarityRanks[badge.rarity] || 4;
  }, [badgeDefinitions]);

  // 4. PERSISTANCE DES DONNÉES - LocalStorage
  useEffect(() => {
    try {
      // L'ancien fil « d'exemple » enregistré par les versions précédentes est ignoré et supprimé.
      localStorage.removeItem('investkit_activity');
      const savedLeaderboards = localStorage.getItem('investkit_leaderboards');
      if (savedLeaderboards) {
        setGuildLeaderboards(JSON.parse(savedLeaderboards));
      }
      const savedTreasures = localStorage.getItem('investkit_treasures');
      if (savedTreasures) {
        setGuildTreasures(JSON.parse(savedTreasures));
      }
      const savedBadges = localStorage.getItem('investkit_badges');
      if (savedBadges) {
        setUserBadges(JSON.parse(savedBadges));
      }
      const savedDisplayBadges = localStorage.getItem('investkit_display_badges');
      if (savedDisplayBadges) {
        setSelectedDisplayBadges(JSON.parse(savedDisplayBadges));
      }
      const savedBadgeBg = localStorage.getItem('investkit_badge_bg');
      if (savedBadgeBg) {
        setBadgeBackgroundColor(JSON.parse(savedBadgeBg));
      }
      const savedBio = localStorage.getItem('investkit_user_bio');
      if (savedBio) {
        setUserBio(JSON.parse(savedBio));
        setBioEditInput(JSON.parse(savedBio));
      }
      const savedLevel = localStorage.getItem('investkit_user_level');
      if (savedLevel) {
        setUserLevel(JSON.parse(savedLevel));
      } else if (userData?.level) {
        setUserLevel(userData.level);
      }
      // NEW: Load enhanced badge system data
      const savedBadgeDates = localStorage.getItem('investkit_badge_dates');
      if (savedBadgeDates) {
        setBadgeDateObtained(JSON.parse(savedBadgeDates));
      }
      const savedBadgeProgress = localStorage.getItem('investkit_badge_progress');
      if (savedBadgeProgress) {
        setBadgeUnlockProgress(JSON.parse(savedBadgeProgress));
      }
      // Load premium badge features
      const savedPinnedBadges = localStorage.getItem('investkit_pinned_badges');
      if (savedPinnedBadges) {
        setPinnedBadges(JSON.parse(savedPinnedBadges));
      }
      const savedBadgeTitles = localStorage.getItem('investkit_badge_titles');
      if (savedBadgeTitles) {
        setBadgeCustomTitles(JSON.parse(savedBadgeTitles));
      }
      const savedBadgeAuras = localStorage.getItem('investkit_badge_auras');
      if (savedBadgeAuras) {
        setBadgeAuraColors(JSON.parse(savedBadgeAuras));
      }
    } catch (e) {
      console.log('LocalStorage not available');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('investkit_leaderboards', JSON.stringify(guildLeaderboards));
      localStorage.setItem('investkit_treasures', JSON.stringify(guildTreasures));
      localStorage.setItem('investkit_badges', JSON.stringify(userBadges));
      localStorage.setItem('investkit_display_badges', JSON.stringify(selectedDisplayBadges));
      localStorage.setItem('investkit_badge_bg', JSON.stringify(badgeBackgroundColor));
      localStorage.setItem('investkit_user_bio', JSON.stringify(userBio));
      localStorage.setItem('investkit_user_level', JSON.stringify(userLevel));
      // NEW: Save enhanced badge system data
      localStorage.setItem('investkit_badge_dates', JSON.stringify(badgeDateObtained));
      localStorage.setItem('investkit_badge_progress', JSON.stringify(badgeUnlockProgress));
      localStorage.setItem('investkit_pinned_badges', JSON.stringify(pinnedBadges));
      localStorage.setItem('investkit_badge_titles', JSON.stringify(badgeCustomTitles));
      localStorage.setItem('investkit_badge_auras', JSON.stringify(badgeAuraColors));
    } catch (e) {
      console.log('Could not save data to localStorage');
    }
  }, [notifications, activityFeed, guildLeaderboards, guildTreasures, userBadges, selectedDisplayBadges, badgeBackgroundColor, userBio, userLevel, badgeDateObtained, badgeUnlockProgress, pinnedBadges, badgeCustomTitles, badgeAuraColors]);

  // Auto-award badges based on level progression
  useEffect(() => {
    const currentLevel = userLevel || 1;
    const newBadges = [...userBadges];
    let badgesAwarded = false;

    // Level-based badges
    const levelBadges = {
      1: 'first_step',
      10: 'investment_guru',
      15: 'crypto_master',
      20: 'portfolio_genius',
      50: 'legend',
    };

    Object.entries(levelBadges).forEach(([level, badgeId]) => {
      if (currentLevel >= parseInt(level) && !newBadges.includes(badgeId)) {
        newBadges.push(badgeId);
        badgesAwarded = true;
      }
    });

    // Course completion badges
    const completedCourses = progress?.completedDomains || [];
    const courseBadges = {
      'crypto': 'crypto_novice',
      'stocks': 'stock_master',
      'realestate': 'real_estate_pro',
    };

    Object.entries(courseBadges).forEach(([course, badgeId]) => {
      if (completedCourses.includes(course) && !newBadges.includes(badgeId)) {
        newBadges.push(badgeId);
        badgesAwarded = true;
      }
    });

    if (badgesAwarded) {
      setUserBadges(newBadges);
    }
  }, [userLevel, progress?.completedDomains]);

  // Calculate badge unlock progress and trigger toasts for newly unlocked badges
  useEffect(() => {
    calculateBadgeProgress();

    // Check for newly unlocked badges and show toasts
    userBadges.forEach(badgeId => {
      if (!badgeDateObtained[badgeId] && !badgeUnlockToasts.some(t => t.badgeId === badgeId)) {
        showBadgeToast(badgeId);
        setBadgeDateObtained(prev => ({
          ...prev,
          [badgeId]: new Date().toISOString(),
        }));
      }
    });
  }, [userLevel, userBadges, isDomainCompleted]);

  // Auto-unlock seasonal badges based on current month
  useEffect(() => {
    const currentMonth = new Date().getMonth();
    let seasonalBadgeId = null;

    if (currentMonth >= 2 && currentMonth <= 4) { // Mars-Mai
      seasonalBadgeId = 'spring_collector';
    } else if (currentMonth >= 5 && currentMonth <= 7) { // Juin-Août
      seasonalBadgeId = 'summer_master';
    } else if (currentMonth >= 8 && currentMonth <= 10) { // Septembre-Novembre
      seasonalBadgeId = 'autumn_warrior';
    } else { // Décembre-Février
      seasonalBadgeId = 'winter_champion';
    }

    if (seasonalBadgeId && !userBadges.includes(seasonalBadgeId)) {
      unlockBadge(seasonalBadgeId);
    }
  }, []);

  // Random secret badge unlock chance (1% per mount)
  useEffect(() => {
    if (Math.random() < 0.01) {
      const secretBadges = ['night_trader', 'lucky_seven', 'speedster', 'million_club'];
      const randomSecret = secretBadges[Math.floor(Math.random() * secretBadges.length)];
      if (!userBadges.includes(randomSecret)) {
        unlockBadge(randomSecret);
      }
    }
  }, [userBadges, unlockBadge]);

  // Notifications réelles : chargées au démarrage puis toutes les 60 s. Une nouvelle notification non lue déclenche une pastille (pop-up) de quelques secondes.
  const NOTIF_ICONS = { bank: '🏦', re: '🏠', security: '🔐', admin: '🎁', pro: '⭐' };
  const knownNotifIds = useRef(null);
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?limit=50`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      if (!res.ok) return;
      const data = await res.json();
      const mapped = data.notifications.map((n) => ({
        id: n.id, type: 'system', user: n.title, avatar: NOTIF_ICONS[n.kind.split('_')[0]] || '🔔', message: n.body, timestamp: new Date(n.createdAt), read: n.read, link: n.link,
      }));
      if (knownNotifIds.current) {
        const fresh = mapped.filter((n) => !n.read && !knownNotifIds.current.has(n.id));
        fresh.slice(0, 3).forEach((n) => {
          const pid = `n${n.id}`;
          setPushNotifications((prev) => [{ id: pid, title: n.user, message: n.message, type: 'system', timestamp: Date.now() }, ...prev.slice(0, 4)]);
          setTimeout(() => setPushNotifications((prev) => prev.filter((p) => p.id !== pid)), 6000);
        });
      }
      knownNotifIds.current = new Set(mapped.map((n) => n.id));
      setNotifications(mapped);
    } catch { /* hors ligne : on réessaie au prochain passage */ }
  }, []);
  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 60000);
    return () => clearInterval(t);
  }, [loadNotifications]);
  const markNotificationsRead = async (body) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify(body) });
    } catch { /* l'état local reste à jour ; la synchronisation se fera au prochain chargement */ }
  };

  // (Les anciens profils d'exemple ont été supprimés : amis et guildes sont réels, voir SocialHub.)
  const [availableUsers] = useState([]);

  const searchUsers = availableUsers.filter(
    (user) =>
      user.friendCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load guildes from localStorage on mount
  useEffect(() => {
    try {
      const savedGuildes = localStorage.getItem('guildes');
      if (savedGuildes) {
        setGuildes(JSON.parse(savedGuildes));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des guildes:', error);
    }
  }, []);

  // Save guildes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('guildes', JSON.stringify(guildes));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des guildes:', error);
    }
  }, [guildes]);

  // Filter guildes based on search and filters
  const filteredGuildes = guildes.filter((guilde) => {
    // Exclude current guild from discovery list
    if (userGuildes.includes(guilde.id)) return false;

    const matchesSearch = guilde.name.toLowerCase().includes(guildeSearchQuery.toLowerCase()) ||
                          guilde.description.toLowerCase().includes(guildeSearchQuery.toLowerCase());
    const matchesLevel = guildeFilterMinLevel === 0 || !guilde.restrictions?.minLevel || guilde.restrictions.minLevel <= guildeFilterMinLevel;
    const matchesDomain = guildeFilterDomain === 'all' || !guilde.restrictions?.domainRequirements ||
                          Object.keys(guilde.restrictions.domainRequirements).length === 0 ||
                          guilde.restrictions.domainRequirements[guildeFilterDomain] > 0;

    return matchesSearch && matchesLevel && matchesDomain;
  });

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const unlockAchievement = (achievementId, achievementData) => {
    if (!unlockedAchievements.includes(achievementId)) {
      setUnlockedAchievements([...unlockedAchievements, achievementId]);
      setNewAchievement(achievementData);
      triggerConfetti();
      setTimeout(() => setNewAchievement(null), 4000);
    }
  };

  const formatRelativeTime = (timestamp) => {
    const ms = Date.now() - (timestamp instanceof Date ? timestamp.getTime() : timestamp);
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);

    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  const isUserGuildLeader = (guilde) => {
    if (!selectedGuilde) return false;
    const userMember = guilde.membersList?.find(m => m.name === 'SMC.SRB');
    return userMember?.role === 'Leader' || userMember?.role === 'Co-leader';
  };

  const handleKickMember = (guildId, memberId) => {
    setGuildes(guildes.map(g => {
      if (g.id === guildId) {
        return {
          ...g,
          membersList: g.membersList.filter(m => m.id !== memberId)
        };
      }
      return g;
    }));

    if (selectedGuilde?.id === guildId) {
      const updatedGuilde = guildes.find(g => g.id === guildId);
      if (updatedGuilde) {
        setSelectedGuilde({
          ...updatedGuilde,
          membersList: updatedGuilde.membersList.filter(m => m.id !== memberId)
        });
      }
    }

    setMemberActionMenu(null);
    setGuildMessage({ type: 'success', text: '✓ Membre expulsé avec succès!' });
    setTimeout(() => setGuildMessage(null), 3000);
  };

  const handleChangeRole = (guildId, memberId, newRole) => {
    setGuildes(guildes.map(g => {
      if (g.id === guildId) {
        return {
          ...g,
          membersList: g.membersList.map(m =>
            m.id === memberId ? { ...m, role: newRole } : m
          )
        };
      }
      return g;
    }));

    if (selectedGuilde?.id === guildId) {
      setSelectedGuilde({
        ...selectedGuilde,
        membersList: selectedGuilde.membersList.map(m =>
          m.id === memberId ? { ...m, role: newRole } : m
        )
      });
    }

    setRoleChangeMenu(null);
    setGuildMessage({ type: 'success', text: `✓ Rôle changé en ${newRole}!` });
    setTimeout(() => setGuildMessage(null), 3000);
  };

  const handleLeaveGuilde = (guildId) => {
    setUserGuildes(userGuildes.filter(id => id !== guildId));
    setSelectedGuilde(null);
    setGuildMessage({
      type: 'success',
      text: `✓ Tu as quitté la guilde.\n\nTu peux maintenant en rejoindre ou en créer une autre.`
    });
    setTimeout(() => setGuildMessage(null), 4000);
  };

  const handleJoinGuilde = (guilde) => {
    // Vérifier si l'utilisateur est déjà dans une guilde (max 1 guilde)
    if (userGuildes.length > 0) {
      const currentGuilde = guildes.find(g => g.id === userGuildes[0]);
      setGuildMessage({
        type: 'error',
        text: `🚫 Tu ne peux être que dans 1 seule guilde à la fois.\n\nTu es actuellement dans: ${currentGuilde?.name || 'une guilde'}\n\nQuitte d'abord cette guilde pour en rejoindre une autre.`
      });
      setTimeout(() => setGuildMessage(null), 5000);
      return;
    }

    // Vérifier l'éligibilité
    const levelOk = !guilde.restrictions.minLevel || progress.userLevel >= guilde.restrictions.minLevel;
    const missingDomains = [];

    Object.entries(guilde.restrictions.domainRequirements || {}).forEach(([domain, requirement]) => {
      if (requirement > 0) {
        const userProgress = progress.domainsProgress?.[domain] || 0;
        if (userProgress < requirement) {
          const domainLabel = domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto';
          missingDomains.push(`${domainLabel}: ${requirement}% (tu as ${userProgress}%)`);
        }
      }
    });

    if (!levelOk || missingDomains.length > 0) {
      // Afficher le message d'erreur
      let errorMsg = '❌ Tu ne peux pas rejoindre cette guilde.\n\n';
      if (!levelOk) {
        errorMsg += `📊 Niveau insuffisant: tu es niveau ${progress.userLevel} (niveau ${guilde.restrictions.minLevel} requis)\n`;
      }
      if (missingDomains.length > 0) {
        errorMsg += `📈 Progression domaine insuffisante:\n${missingDomains.map(d => `  • ${d}`).join('\n')}`;
      }

      setGuildMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setGuildMessage(null), 5000);
    } else {
      // Rejoindre avec succès
      setUserGuildes([...userGuildes, guilde.id]);
      setGuildMessage({
        type: 'success',
        text: `✓ Bravo! Tu as rejoint ${guilde.name}!\n\nTu peux maintenant participer aux discussions et activités de la guilde.`
      });
      setTimeout(() => setGuildMessage(null), 5000);
      // Fermer le modal après 2 secondes
      setTimeout(() => setSelectedGuilde(null), 2000);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // La palette vient des variables de design communes (app/styles/tokens.css) : clair et sombre suivent le thème du site.
  const tokens = {
    bg: 'var(--ik-surface-1)',
    cardBg: 'var(--ik-surface-card)',
    text: 'var(--ik-text)',
    textSecondary: 'var(--ik-text-2)',
    textTertiary: 'var(--ik-text-3)',
    border: 'var(--ik-border-strong)',
    accent: 'var(--ik-accent)',
    sidebar: 'var(--ik-surface-1)',
  };
  const theme = { dark: tokens, light: tokens };

  const currentTheme = isDarkMode ? theme.dark : theme.light;

  // Vue d'ensemble RÉELLE (serveur) : pièces, Bourse, Crypto, Immobilier, dette, risque. Aucune valeur de démonstration.
  const [overview, setOverview] = useState(null);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const loadOverview = useCallback(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/overview`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setOverview(d); setOverviewFailed(false); } else setOverviewFailed(true); })
      .catch(() => setOverviewFailed(true));
  }, []);
  const n0 = (v) => Number(v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  const signed = (v) => `${Number(v) > 0 ? '+' : ''}${n0(v)}`;
  const ovTot = overview?.totals;

  useEffect(() => {
    loadOverview();
  }, [loadOverview, tradingPortfolio?.simulatedYear, tradingPortfolio?.cashBalance, tradingPortfolio?.positions?.length]);
  useEffect(() => {
    // Nom affiché : celui du compte, sauf si l'utilisateur en a saisi un autre dans son profil.
    if (overview?.username && !(typeof window !== 'undefined' && localStorage.getItem('userFullName'))) setFullName(overview.username);
  }, [overview?.username]);

  const [dailyTips] = useState([
    {
      id: 1,
      title: 'Règle des 50/30/20',
      tip: 'Alloquez 50% à vos besoins, 30% à vos envies et 20% à l\'épargne/investissement',
      icon: '💰',
    },
    {
      id: 2,
      title: 'Diversification',
      tip: 'Ne mettez jamais tout votre argent dans un seul investissement. Répartissez le risque.',
      icon: '📊',
    },
    {
      id: 3,
      title: 'Dollar Cost Averaging',
      tip: 'Investissez régulièrement des montants fixes pour lisser les prix d\'achat',
      icon: '📈',
    },
    {
      id: 4,
      title: 'Fonds d\'urgence',
      tip: 'Maintenez 3-6 mois de dépenses en compte d\'épargne avant d\'investir',
      icon: '🛡️',
    },
    {
      id: 5,
      title: 'Rebalancement',
      tip: 'Réajustez votre portefeuille 2x par an pour maintenir votre allocation cible',
      icon: '⚖️',
    },
  ]);

  // Projets : fonctionnalité pas encore branchée au serveur. Les anciens projets de démonstration (valeurs inventées) ne sont plus affichés.
  const [projects] = useState([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }

    // Load profile photo
    const savedPhoto = typeof window !== 'undefined' ? localStorage.getItem('profilePhoto') : null;
    if (savedPhoto) {
      setPhotoPreview(savedPhoto);
    }

    // Load profile data (name, email)
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null;
    if (savedName) {
      setFullName(savedName);
    }
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    if (savedEmail) {
      setEmail(savedEmail);
    }

    // Load visibility settings
    const savedVisibility = typeof window !== 'undefined' ? localStorage.getItem('profileVisibility') : null;
    if (savedVisibility) {
      setProfileVisibility(savedVisibility);
    }
    const savedHideStats = typeof window !== 'undefined' ? localStorage.getItem('hideStats') : null;
    if (savedHideStats) {
      setHideStats(JSON.parse(savedHideStats));
    }
    const savedShareProgress = typeof window !== 'undefined' ? localStorage.getItem('shareProgress') : null;
    if (savedShareProgress !== null) {
      setShareProgress(JSON.parse(savedShareProgress));
    }

    // Load learning preferences
    const savedDomain = typeof window !== 'undefined' ? localStorage.getItem('preferredDomain') : null;
    if (savedDomain) {
      setPreferredDomain(savedDomain);
    }
    const savedDifficulty = typeof window !== 'undefined' ? localStorage.getItem('difficultyLevel') : null;
    if (savedDifficulty) {
      setDifficultyLevel(savedDifficulty);
    }
    const savedNotifications = typeof window !== 'undefined' ? localStorage.getItem('academyNotifications') : null;
    if (savedNotifications !== null) {
      setAcademyNotifications(JSON.parse(savedNotifications));
    }
  }, [router]);

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setPhotoPreview(base64);
        setProfilePhoto(file);
        if (typeof window !== 'undefined') {
          localStorage.setItem('profilePhoto', base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile changes
  const saveProfileChanges = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userFullName', fullName);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('profileVisibility', profileVisibility);
      localStorage.setItem('hideStats', JSON.stringify(hideStats));
      localStorage.setItem('shareProgress', JSON.stringify(shareProgress));
      localStorage.setItem('preferredDomain', preferredDomain);
      localStorage.setItem('difficultyLevel', difficultyLevel);
      localStorage.setItem('academyNotifications', JSON.stringify(academyNotifications));
    }
    alert('Profil mis à jour avec succès!');
  };

  // Le thème est désormais commun à tout le site (bascule dans le menu latéral, le profil et ici).
  const toggleTheme = () => toggleGlobalTheme();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
    <div className="dash-layout">
      <div className="dash-aurora" aria-hidden="true" />
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 16px color-mix(in srgb, var(--ik-warning) 40%, transparent); }
          50% { transform: scale(1.05); box-shadow: 0 12px 24px color-mix(in srgb, var(--ik-warning) 60%, transparent); }
        }
        @keyframes badgeGlow {
          0% { filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ik-warning) 60%, transparent)); }
          50% { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--ik-warning) 80%, transparent)); }
          100% { filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ik-warning) 60%, transparent)); }
        }
        @keyframes levelUpBurst {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes badgeRotate {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes particleFloat {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
          50% { filter: drop-shadow(0 0 16px currentColor); }
        }
        @keyframes milestoneCelebrate {
          0% { transform: scale(0.8) rotateZ(-10deg); }
          50% { transform: scale(1.1) rotateZ(5deg); }
          100% { transform: scale(1) rotateZ(0deg); }
        }
        .dashboard-content {
          animation: slideInUp 0.6s ease-out;
        }
        .metric-card {
          transition: all 0.3s ease;
        }
        .metric-card:hover {
          transform: translateY(-2px);
        }
        .modal-overlay {
          animation: fadeIn 0.3s ease-out;
        }
        .badge-animated {
          animation: badgePulse 2s ease-in-out infinite;
        }
        .badge-glow {
          animation: badgeGlow 2s ease-in-out infinite;
        }
        /* NEW: Advanced Badge Animations */
        @keyframes badgeFlip {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes levitate {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotateZ(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotateZ(720deg) scale(0);
            opacity: 0;
          }
        }
        @keyframes toastSlideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
        @keyframes badgeUnlock {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes rainbowShift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .badge-flip-active {
          animation: badgeFlip 0.6s ease-in-out;
        }
        .badge-shimmer {
          background: linear-gradient(90deg, color-mix(in srgb, var(--ik-text) 0%, transparent) 0%, color-mix(in srgb, var(--ik-text) 30%, transparent) 50%, color-mix(in srgb, var(--ik-text) 0%, transparent) 100%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .badge-levitate {
          animation: levitate 3s ease-in-out infinite;
        }
        .toast-notification {
          animation: toastSlideIn 0.4s ease-out;
        }
        .toast-notification.closing {
          animation: toastSlideOut 0.4s ease-in forwards;
        }
        .badge-unlock-animation {
          animation: badgeUnlock 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .badge-rare { filter: drop-shadow(0 0 8px rgba(139, 69, 19, 0.6)); }
        .badge-very-rare { filter: drop-shadow(0 0 12px rgba(218, 165, 32, 0.8)); }
        .badge-unique { filter: drop-shadow(0 0 16px rgba(255, 215, 0, 1)); animation: rainbowShift 3s linear infinite; }
        .profile-section {
          border-top: 1px solid color-mix(in srgb, var(--ik-text) 10%, transparent);
          padding-top: 16px;
          margin-top: 16px;
        }
        .profile-section:first-child {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }
      `}</style>

      {/* Le rail profil (avatar, badges, niveau) a été retiré du tableau de bord à la demande du propriétaire. */}

      {/* MAIN CONTENT - CENTER COLUMN */}
      <div className="dash-main">
        <PageHeader
          title="Tableau de bord"
          subtitle="Ton patrimoine et tes domaines, en un coup d'œil."
          actions={<Button icon="file" onClick={() => setNewsModalOpen(true)}>Actualités</Button>}
        />
        <div className="dash-tabs">
          <Tabs
            ariaLabel="Sections du tableau de bord"
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { value: 'overview', label: 'Vue d\'ensemble' },
              { value: 'market', label: 'Marché' },
              { value: 'trading', label: 'Simulateur' },
              { value: 'education', label: 'Académie' },
              { value: 'friends', label: `Amis (${userData.friends.length})` },
              { value: 'notifications', label: `Notifications${notifications.filter((n) => !n.read).length > 0 ? ` (${notifications.filter((n) => !n.read).length})` : ''}` },
              { value: 'settings', label: 'Paramètres' },
            ]}
          />
        </div>

        <div key={activeTab} className="dash-tabpanel">
        {activeTab === 'overview' && <OverviewTab overview={overview} failed={overviewFailed} onRetry={() => { setOverviewFailed(false); loadOverview(); }} onOpenTab={setActiveTab} />}

        {/* MARKET TAB : cours réels du marché simulé, aucune valeur en dur */}
        {activeTab === 'market' && <MarketTab />}

        {/* TRADING TAB - Simulateur Bourse (mode accéléré) */}
        {activeTab === 'trading' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ik-text)', margin: '0 0 8px 0' }}>
              📈 Simulateur — Mode Accéléré
            </h2>
            <p style={{ color: 'var(--ik-text-3)', fontSize: '13px', margin: '0 0 24px 0' }}>
              Achète et vends avec tes InvestCoins sur des données historiques simplifiées (illustratives, pas de vrais cours).
            </p>

            {!tradingLoaded ? (
              <p style={{ color: 'var(--ik-text-3)' }}>Chargement...</p>
            ) : (
              <>
                {/* Sélecteur de domaine */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {tradingDomains.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => changeTradingDomain(d.id)}
                      disabled={tradingLoading}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '20px',
                        border: `1px solid ${tradingDomain === d.id ? 'rgba(96,165,250,0.6)' : 'color-mix(in srgb, var(--ik-text) 15%, transparent)'}`,
                        background: tradingDomain === d.id ? 'color-mix(in srgb, var(--ik-primary) 25%, transparent)' : 'transparent',
                        color: tradingDomain === d.id ? 'var(--ik-accent)' : 'color-mix(in srgb, var(--ik-text) 70%, transparent)',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {d.id === 'crypto' ? '₿ ' : '📊 '}{d.label}
                    </button>
                  ))}
                  <button
                    onClick={() => router.push('/immobilier')}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: '1px solid color-mix(in srgb, var(--ik-text) 15%, transparent)', background: 'transparent', color: 'var(--ik-text-2)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    🏠 Immobilier →
                  </button>
                  <button
                    onClick={() => router.push('/crypto')}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: '1px solid color-mix(in srgb, var(--ik-text) 15%, transparent)', background: 'transparent', color: 'var(--ik-text-2)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    ₿ Marché Crypto →
                  </button>
                </div>

                {/* Portfolio summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                }}>
                  {[
                    { label: 'Année simulée', value: tradingPortfolio?.simulatedYear, tip: 'annee-simulee' },
                    { label: 'Solde InvestCoins', value: `🪙 ${tradingPortfolio?.cashBalance?.toLocaleString('fr-FR')}` },
                    { label: 'Valeur positions', value: `${tradingPortfolio?.marketValue?.toLocaleString('fr-FR')} €`, tip: 'valeur-positions' },
                    {
                      label: 'Performance',
                      tip: 'performance-portefeuille',
                      value: `${tradingPortfolio?.performancePct >= 0 ? '+' : ''}${tradingPortfolio?.performancePct?.toFixed(1)}%`,
                      color: tradingPortfolio?.performancePct >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)',
                    },
                  ].map((stat, idx) => (
                    <div key={idx} style={{
                      background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}>
                      <p style={{ fontSize: '11px', color: 'var(--ik-text-3)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>{stat.label}{stat.tip && <HelpTip term={stat.tip} />}</p>
                      <p style={{ fontSize: '18px', fontWeight: '800', color: stat.color || 'var(--ik-text)', margin: 0 }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={tradingAdvanceYear}
                  disabled={tradingLoading || tradingPortfolio?.simulatedYear >= tradingPortfolio?.maxYear}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: tradingPortfolio?.simulatedYear >= tradingPortfolio?.maxYear
                      ? 'color-mix(in srgb, var(--ik-text) 10%, transparent)'
                      : 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
                    color: 'var(--ik-text-on-primary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: tradingLoading ? 'wait' : 'pointer',
                    marginBottom: '24px',
                  }}
                >
                  ⏩ Avancer d'un an {tradingPortfolio?.simulatedYear < tradingPortfolio?.maxYear ? `(→ ${tradingPortfolio?.simulatedYear + 1})` : `(déjà en ${tradingPortfolio?.maxYear})`}
                </button>

                {tradingError && (
                  <p style={{ color: 'var(--ik-negative)', fontSize: '13px', marginBottom: '16px' }}>{tradingError}</p>
                )}

                {/* Prêt sur portefeuille en cours : rapport prêt/valeur et appel de marge (calculés par le serveur) */}
                {tradingPortfolio?.bank?.loan && (
                  <div style={{ background: tradingPortfolio.bank.loan.state === 'ok' ? 'color-mix(in srgb, var(--ik-primary) 12%, transparent)' : 'color-mix(in srgb, var(--ik-warning) 15%, transparent)', border: `1px solid ${tradingPortfolio.bank.loan.state === 'ok' ? 'rgba(96,165,250,0.4)' : 'color-mix(in srgb, var(--ik-warning) 60%, transparent)'}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '20px', color: 'var(--ik-text)', fontSize: '13px' }}>
                    🏦 Prêt sur portefeuille : dette {tradingPortfolio.bank.loan.debtCoins} 🪙 · rapport prêt/valeur {tradingPortfolio.bank.loan.ltvPct} %.
                    {tradingPortfolio.bank.loan.state !== 'ok' && <strong style={{ color: 'var(--ik-warning)' }}> Appel de marge : rembourse ou ajoute des titres avant le prochain passage d'année, sinon vente forcée.</strong>}
                    <button onClick={() => router.push('/banque')} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--ik-accent)', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>Ouvrir ma banque</button>
                  </div>
                )}

                {/* Accès : domaine gratuit / Pro (vérifié côté serveur) */}
                {(tradingPortfolio?.access?.reason === 'FREE_DOMAIN_NOT_CHOSEN' || showDomainChooser) && (
                  <div style={{ background: 'color-mix(in srgb, var(--ik-primary) 12%, transparent)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ik-text)', margin: '0 0 8px 0' }}>{showDomainChooser ? 'Change ton domaine gratuit (une seule fois)' : 'Choisis ton domaine gratuit'}</h3>
                    <p style={{ color: 'var(--ik-text-2)', fontSize: '13px', margin: '0 0 14px 0' }}>
                      Le plan gratuit débloque l'achat dans UN domaine. {showDomainChooser ? 'Ce changement est le dernier : ensuite le choix sera définitif.' : 'Ce choix est définitif (le plan Pro débloque tous les domaines).'} Tu peux vendre partout à tout moment.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {tradingDomains.map((d) => (
                        <button key={d.id} onClick={() => chooseFreeDomain(d.id)} disabled={tradingLoading || d.id === tradingPortfolio?.freeDomain}
                          style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(96,165,250,0.6)', background: 'color-mix(in srgb, var(--ik-primary) 25%, transparent)', color: 'var(--ik-accent)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: d.id === tradingPortfolio?.freeDomain ? 0.4 : 1 }}>
                          {d.label}{d.id === tradingPortfolio?.freeDomain ? ' (actuel)' : ''}
                        </button>
                      ))}
                      <button
                        onClick={async () => {
                          if (!window.confirm(showDomainChooser ? "Passer ton domaine gratuit à l'Immobilier ? C'est ton dernier changement." : "Choisir l'Immobilier comme domaine gratuit ? Ce choix est définitif (le plan Pro débloque tous les domaines).")) return;
                          await chooseFreeDomain('real_estate');
                          router.push('/immobilier');
                        }}
                        disabled={tradingLoading || tradingPortfolio?.freeDomain === 'real_estate'}
                        style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(96,165,250,0.6)', background: 'color-mix(in srgb, var(--ik-primary) 25%, transparent)', color: 'var(--ik-accent)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: tradingPortfolio?.freeDomain === 'real_estate' ? 0.4 : 1 }}>
                        🏠 Immobilier{tradingPortfolio?.freeDomain === 'real_estate' ? ' (actuel)' : ''}
                      </button>
                      {showDomainChooser && (
                        <button onClick={() => setShowDomainChooser(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--ik-text-3)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
                      )}
                    </div>
                  </div>
                )}
                {tradingPortfolio?.access?.reason === 'DOMAIN_LOCKED' && (
                  <div style={{ background: 'color-mix(in srgb, var(--ik-warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-warning) 40%, transparent)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', color: 'var(--ik-warning)', fontSize: '13px' }}>
                    🔒 Ce domaine n'est pas ton domaine gratuit : l'achat nécessite le plan Pro. Tu peux toujours vendre tes positions.
                    {tradingPortfolio?.canChangeFreeDomain && (
                      <button onClick={() => setShowDomainChooser(true)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--ik-accent)', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>Changer mon domaine gratuit (1 fois)</button>
                    )}
                  </div>
                )}

                <HistoryChart domain={tradingDomain} symbol={tradingSelectedAsset} simulatedYear={tradingPortfolio?.simulatedYear} enabled={!!tradingPortfolio && tradingAssets.some((a) => a.symbol === tradingSelectedAsset)} />

                {/* Achat */}
                <div style={{
                  background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '24px',
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ik-text)', margin: '0 0 16px 0' }}>Acheter</h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={tradingSelectedAsset}
                      onChange={(e) => setTradingSelectedAsset(e.target.value)}
                      style={{
                        padding: '10px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
                        background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: '13px',
                      }}
                    >
                      {tradingAssets.map((a) => {
                        const price = tradingPortfolio?.prices?.[a.symbol];
                        return (
                          <option key={a.symbol} value={a.symbol} disabled={price == null}>
                            {a.name} ({a.symbol}) — {price == null ? 'pas encore coté' : `${price.toLocaleString('fr-FR')} €`}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      min={tradingDomain === 'crypto' ? '0.0001' : '1'}
                      step={tradingDomain === 'crypto' ? 'any' : '1'}
                      value={tradingQuantity}
                      onChange={(e) => setTradingQuantity(e.target.value)}
                      style={{
                        width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
                        background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: '13px',
                      }}
                    />
                    {tradingDomain !== 'crypto' && (
                      <select
                        value={tradingAccount}
                        onChange={(e) => setTradingAccount(e.target.value)}
                        aria-label="Enveloppe"
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)', background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: '13px' }}
                      >
                        <option value="pea">PEA</option>
                        <option value="cto">Compte-titres</option>
                      </select>
                    )}
                    <span style={{ color: 'var(--ik-text-3)', fontSize: '13px' }}>
                      ≈ {((tradingPortfolio?.prices?.[tradingSelectedAsset] ?? 0) * Number(tradingQuantity || 0)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} 🪙
                      {' '}+ courtage (~{tradingPortfolio?.costs?.brokeragePct?.[tradingAssets.find((a) => a.symbol === tradingSelectedAsset)?.type ?? 'stock'] ?? 0} %)
                      <HelpTip term="courtage" />
                    </span>
                    <button
                      onClick={tradingBuy}
                      disabled={tradingLoading || tradingPortfolio?.access?.canBuy === false}
                      style={{
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        background: 'var(--ik-positive)', color: 'var(--ik-text-on-positive)', fontWeight: '700', fontSize: '13px',
                        opacity: tradingPortfolio?.access?.canBuy === false ? 0.4 : 1,
                        cursor: tradingLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Acheter
                    </button>
                  </div>
                  {tradingDomain === 'stocks' && tradingPortfolio?.costs?.pea && (
                    <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--ik-text-3)' }}>
                      {tradingAccount === 'pea'
                        ? (tradingPortfolio.costs.pea.openedYear
                          ? `PEA ouvert en ${tradingPortfolio.costs.pea.openedYear} : exonéré d'impôt sur le revenu à partir de ${tradingPortfolio.costs.pea.exemptFromYear}. Versé : ${tradingPortfolio.costs.pea.deposits.toLocaleString('fr-FR')} / ${tradingPortfolio.costs.pea.depositCeiling.toLocaleString('fr-FR')} 🪙.`
                          : 'Ton PEA s\'ouvre à ton premier achat : après 5 ans, plus d\'impôt sur le revenu sur les gains (il reste les prélèvements sociaux).')
                        : 'Compte-titres : flat tax sur chaque plus-value, sans condition de durée.'}
                      <HelpTip term="pea" />
                    </p>
                  )}
                  {tradingDomain === 'crypto' && tradingPortfolio?.costs && (
                    <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--ik-text-3)' }}>
                      Crypto : impôt uniquement à la vente contre euros. Cessions de l'année : {(tradingPortfolio.costs.cryptoDisposalsThisYear ?? 0).toLocaleString('fr-FR')} 🪙 (aucun impôt tant que le total reste sous {tradingPortfolio.costs.cryptoThreshold} 🪙).
                      <HelpTip term="impot-crypto" />
                    </p>
                  )}
                  {tradingPortfolio?.costs && (tradingPortfolio.costs.feesPaid > 0 || tradingPortfolio.costs.taxPaid > 0) && (
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--ik-text-3)' }}>
                      Payé depuis le début : {tradingPortfolio.costs.feesPaid.toLocaleString('fr-FR')} 🪙 de courtage, {tradingPortfolio.costs.taxPaid.toLocaleString('fr-FR')} 🪙 d'impôts.
                    </p>
                  )}
                </div>

                {/* Positions */}
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ik-text)', margin: '0 0 16px 0' }}>Mes positions</h3>
                {tradingPortfolio?.positions?.length === 0 ? (
                  <p style={{ color: 'var(--ik-text-3)', fontSize: '13px' }}>Aucune position — achète ton premier titre ci-dessus.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {tradingPortfolio?.positions?.map((pos) => (
                      <div key={`${pos.symbol}-${pos.account}`} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                        borderRadius: '10px',
                        padding: '14px 18px',
                      }}>
                        <div>
                          <p style={{ color: 'var(--ik-text)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px 0' }}>{pos.symbol}{pos.account && pos.account !== 'crypto' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#93c5fd' }}>{pos.account === 'pea' ? 'PEA' : 'Compte-titres'}</span>}</p>
                          <p style={{ color: 'var(--ik-text-3)', fontSize: '12px', margin: 0 }}>
                            {Number(pos.quantity.toFixed(6))} × prix moyen {pos.avgBuyPrice.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}€
                          </p>
                        </div>
                        <button
                          onClick={() => tradingPreviewSell(pos)}
                          disabled={tradingLoading}
                          style={{
                            padding: '8px 16px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--ik-negative) 40%, transparent)',
                            background: 'color-mix(in srgb, var(--ik-negative) 15%, transparent)', color: 'var(--ik-negative)', fontWeight: '700', fontSize: '12px',
                            cursor: tradingLoading ? 'wait' : 'pointer',
                          }}
                        >
                          Vendre tout…
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tradingQuote && (
                  <div style={{ marginTop: 14, background: 'color-mix(in srgb, var(--ik-primary) 12%, transparent)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 12, padding: '14px 18px', color: 'var(--ik-text)', fontSize: 13 }}>
                    <strong>Vente de {Number(tradingQuote.quantity.toFixed(6))} {tradingQuote.symbol}</strong> : produit {tradingQuote.amount.toLocaleString('fr-FR')} 🪙,
                    courtage {tradingQuote.fee.toLocaleString('fr-FR')} 🪙, impôt sur la plus-value {tradingQuote.tax.toLocaleString('fr-FR')} 🪙
                    {' '}→ <strong>tu reçois {tradingQuote.net.toLocaleString('fr-FR')} 🪙</strong>.
                    {tradingQuote.note && <div style={{ marginTop: 6, color: 'var(--ik-text-2)' }}>{tradingQuote.note}</div>}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button onClick={() => tradingSell(tradingQuote.symbol, tradingQuote.quantity, tradingQuote.account)} disabled={tradingLoading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--ik-negative)', color: 'var(--ik-text-on-negative)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Confirmer la vente</button>
                      <button onClick={() => setTradingQuote(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)', background: 'transparent', color: 'var(--ik-text)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  </div>
                )}

                <PortfolioRisk domain={tradingDomain} refreshKey={`${tradingPortfolio?.simulatedYear}-${tradingPortfolio?.positions?.length}-${tradingPortfolio?.cashBalance}-${tradingPortfolio?.marketValue}`} />

                {/* Classement (comparaison à année simulée égale) */}
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ik-text)', margin: '32px 0 8px 0' }}>🏆 Classement</h3>
                <p style={{ color: 'var(--ik-text-3)', fontSize: '12px', margin: '0 0 12px 0' }}>
                  Les joueurs sont comparés à la même année simulée. Il faut avoir engagé au moins {tradingBoard?.minCapital ?? 100} 🪙 pour être classé.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <select
                    value={tradingBoard?.year ?? ''}
                    onChange={(e) => { setTradingBoardYear(e.target.value); loadTradingBoard(tradingDomain, e.target.value); }}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)', background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: '13px' }}
                  >
                    {tradingPortfolio && Array.from({ length: tradingPortfolio.maxYear - tradingPortfolio.minYear + 1 }, (_, i) => tradingPortfolio.minYear + i).map((y) => (
                      <option key={y} value={y}>Année {y}</option>
                    ))}
                  </select>
                </div>
                {!tradingBoard || tradingBoard.entries.length === 0 ? (
                  <p style={{ color: 'var(--ik-text-3)', fontSize: '13px' }}>Personne n'est encore classé pour cette année.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {tradingBoard.entries.map((e, i) => (
                      <div key={`${e.rank}-${e.username}-${i}`} style={{
                        display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '10px',
                        background: e.isMe ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                        border: `1px solid ${e.isMe ? 'rgba(96,165,250,0.5)' : 'color-mix(in srgb, var(--ik-text) 10%, transparent)'}`,
                        color: 'var(--ik-text)', fontSize: '13px',
                      }}>
                        <span>#{e.rank} {e.username}{e.isMe ? ' (toi)' : ''}</span>
                        <span style={{ color: e.performancePct >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)', fontWeight: '700' }}>
                          {e.performancePct >= 0 ? '+' : ''}{e.performancePct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {tradingBoard && !tradingBoard.entries.some((e) => e.isMe) && (
                  <p style={{ color: 'var(--ik-text-3)', fontSize: '13px', marginTop: '10px' }}>
                    {tradingBoard.me
                      ? `Ton rang : #${tradingBoard.me.rank} sur ${tradingBoard.totalRanked} (${tradingBoard.me.performancePct.toFixed(1)}%)`
                      : 'Non classé pour cette année (capital engagé insuffisant ou aucun achat).'}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: currentTheme.text,
                  margin: '0 0 8px 0',
                }}>
                  📚 Académie
                </h2>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                }}>
                  <span style={{ color: currentTheme.textSecondary }}>
                    Niveau {progress.userLevel}
                  </span>
                  <span style={{ color: currentTheme.accent }}>
                    ⭐ {progress.totalXP} XP
                  </span>
                  {progress.streak > 0 && (
                    <span style={{ color: 'var(--ik-warning)' }}>
                      🔥 Racha: {progress.streak}
                    </span>
                  )}
                  {progress.badges && progress.badges.length > 0 && (
                    <span style={{ color: 'var(--ik-accent)' }}>
                      ✨ {progress.badges.length} Badges
                    </span>
                  )}
                </div>
              </div>
              <a href="/education" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                borderRadius: '10px',
                color: currentTheme.accent,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}>
                Voir tous les domaines →
              </a>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}>
              {educationDomains.slice(0, 4).map((domain) => {
                const isCompleted = isDomainCompleted(domain.id);
                const progressPercent = getDomainProgress(domain);

                return (
                  <a
                    key={domain.id}
                    href={`/education/${domain.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="metric-card" style={{
                      background: currentTheme.cardBg,
                      borderRadius: '16px',
                      padding: '20px',
                      border: `1px solid ${currentTheme.border}`,
                      backdropFilter: 'blur(20px)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = domain.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = currentTheme.border;
                    }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px',
                      }}>
                        <div style={{ fontSize: '28px' }}>{domain.icon}</div>
                        <div style={{ fontSize: '24px' }}>
                          {isCompleted ? domain.badge : ''}
                        </div>
                      </div>

                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: currentTheme.text,
                        margin: '0 0 4px 0',
                      }}>
                        {domain.name}
                      </h3>

                      <p style={{
                        fontSize: '12px',
                        color: currentTheme.textSecondary,
                        margin: '0 0 12px 0',
                      }}>
                        {domain.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontSize: '12px',
                      }}>
                        <span style={{ color: currentTheme.textTertiary }}>Progression</span>
                        <span style={{ color: domain.color, fontWeight: '600' }}>
                          {progressPercent}%
                        </span>
                      </div>

                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: currentTheme.border,
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${domain.color}, ${alpha(domain.color, 50)})`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>

                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${currentTheme.border}`,
                        fontSize: '11px',
                        color: currentTheme.textTertiary,
                      }}>
                        {isCompleted ? (
                          <span style={{ color: 'var(--ik-positive)', fontWeight: '600' }}>✓ Maîtrisé</span>
                        ) : progressPercent > 0 ? (
                          <span style={{ color: currentTheme.accent }}>En cours...</span>
                        ) : (
                          <span>Commencer →</span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {progress.completedDomains.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 16px 0',
                }}>
                  🏆 Mes Badges ({progress.completedDomains.length})
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '12px',
                }}>
                  {educationDomains
                    .filter((d) => isDomainCompleted(d.id))
                    .map((domain) => (
                      <div
                        key={domain.id}
                        style={{
                          padding: '12px',
                          background: currentTheme.cardBg,
                          borderRadius: '12px',
                          border: `2px solid ${alpha(domain.color, 25)}`,
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.borderColor = domain.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = `${alpha(domain.color, 25)}`;
                        }}
                      >
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '4px',
                        }}>
                          {domain.badge}
                        </div>
                        <p style={{
                          fontSize: '10px',
                          color: currentTheme.textSecondary,
                          margin: 0,
                          fontWeight: '600',
                        }}>
                          {domain.name}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AMIS ET GUILDES : réels (serveur), voir SocialHub */}
        {activeTab === 'friends' && <SocialHub tab={socialTab} onTab={setSocialTab} />}

        {/* SETTINGS PAGE */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: currentTheme.text,
              margin: '0 0 24px 0',
            }}>
              ⚙️ Paramètres
            </h2>

            {/* Settings Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {[
                { id: 'general', label: '🎨 Affichage', icon: '🎨' },
                { id: 'profile', label: '👤 Profil', icon: '👤' },
                { id: 'security', label: '🔐 Sécurité', icon: '🔐' },
                { id: 'alerts', label: '🔔 Alertes', icon: '🔔' },
                { id: 'privacy', label: '📊 Données', icon: '📊' },
                { id: 'billing', label: '💳 Abonnement', icon: '💳' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    background: settingsTab === tab.id
                      ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)'
                      : currentTheme.cardBg,
                    border: `1px solid ${settingsTab === tab.id
                      ? 'color-mix(in srgb, var(--ik-primary) 40%, transparent)'
                      : currentTheme.border}`,
                    borderRadius: '10px',
                    color: settingsTab === tab.id ? currentTheme.accent : currentTheme.text,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (settingsTab !== tab.id) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 10%, transparent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (settingsTab !== tab.id) {
                      e.currentTarget.style.background = currentTheme.cardBg;
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div style={{
              background: currentTheme.cardBg,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${currentTheme.border}`,
              backdropFilter: 'blur(20px)',
            }}>
              {/* AFFICHAGE TAB */}
              {settingsTab === 'general' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🎨 Préférences d'Affichage
                  </h3>

                  {/* Theme Toggle */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Mode Thème
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        {isDarkMode ? 'Mode sombre activé' : 'Mode clair activé'}
                      </p>
                    </div>
                    <button onClick={toggleTheme} style={{
                      padding: '8px 16px',
                      background: isDarkMode ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 15%, transparent)',
                      border: `1px solid ${isDarkMode ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 25%, transparent)'}`,
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 20%, transparent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 15%, transparent)'; }}
                    >
                      {isDarkMode ? '🌙 Sombre' : '☀️ Clair'}
                    </button>
                  </div>

                  {/* Devise */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Devise
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        EUR (€)
                      </p>
                    </div>
                    <select style={{
                      padding: '8px 12px',
                      background: `${currentTheme.border}`,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '8px',
                      color: currentTheme.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      <option>EUR (€)</option>
                      <option>USD ($)</option>
                      <option>GBP (£)</option>
                    </select>
                  </div>

                  {/* Format de date */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Format de date
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Jour/Mois/Année
                      </p>
                    </div>
                    <select style={{
                      padding: '8px 12px',
                      background: `${currentTheme.border}`,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '8px',
                      color: currentTheme.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      <option>JJ/MM/AAAA</option>
                      <option>MM/JJ/AAAA</option>
                      <option>AAAA-MM-JJ</option>
                    </select>
                  </div>
                </div>
              )}

              {/* PROFIL TAB */}
              {settingsTab === 'profile' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: 0,
                    }}>
                      👤 Profil Utilisateur
                    </h3>
                    <a href="/profile" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}>
                      📊 Voir profil complet →
                    </a>
                  </div>

                  {/* Profile Photo Upload */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '12px',
                      background: currentTheme.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      fontSize: '40px',
                    }}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile" style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }} />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '8px',
                      flex: 1,
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0px',
                      }}>
                        Photo de Profil
                      </label>
                      <p style={{
                        fontSize: '12px',
                        color: currentTheme.textSecondary,
                        margin: '0 0 8px 0',
                      }}>
                        Cliquez pour uploader une photo (JPG, PNG)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{
                          padding: '8px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div style={{
                    display: 'grid',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: currentTheme.border,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '8px',
                          color: currentTheme.text,
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '6px',
                      }}>
                        Bio
                      </label>
                      <textarea defaultValue="Passionné par l'investissement et l'apprentissage 🚀" style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: currentTheme.border,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        color: currentTheme.text,
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        minHeight: '80px',
                      }} />
                    </div>
                  </div>

                  <button
                    onClick={saveProfileChanges}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 30%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 20%, transparent)';
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}>
                    Enregistrer les modifications
                  </button>

                  {/* Stats Section */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      📊 Mes Statistiques Académie
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px',
                    }}>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Niveau</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ik-accent)', margin: 0 }}>Lvl {progress.userLevel}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>XP Total</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ik-warning)', margin: 0 }}>{progress.totalXP} XP</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Racha</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ik-warning)', margin: 0 }}>🔥 {progress.streak}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Badges</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ik-accent)', margin: 0 }}>{progress.badges?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Visibility Settings */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      👤 Visibilité du Profil
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {/* Profile Visibility */}
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Visibilité du profil
                        </label>
                        <select
                          value={profileVisibility}
                          onChange={(e) => setProfileVisibility(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="public">🌍 Public</option>
                          <option value="private">🔒 Privé</option>
                          <option value="friends">👥 Amis seulement</option>
                        </select>
                      </div>

                      {/* Hide Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Masquer les statistiques
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Cacher votre XP et niveau publiquement
                          </p>
                        </div>
                        <button
                          onClick={() => setHideStats(!hideStats)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: hideStats ? 'var(--ik-primary)' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: hideStats ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>

                      {/* Share Progress */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Partager la progression
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Autoriser le partage de vos données
                          </p>
                        </div>
                        <button
                          onClick={() => setShareProgress(!shareProgress)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: shareProgress ? 'var(--ik-primary)' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: shareProgress ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Learning Preferences */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 16px 0',
                    }}>
                      🎓 Préférences d'Apprentissage
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {/* Preferred Domain */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Domaine d'investissement préféré
                        </label>
                        <select
                          value={preferredDomain}
                          onChange={(e) => setPreferredDomain(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="crypto">🪙 Crypto-monnaies</option>
                          <option value="stocks">📈 Actions/Bourse</option>
                          <option value="real-estate">🏠 Immobilier</option>
                          <option value="bonds">📊 Obligations</option>
                          <option value="forex">💱 Forex</option>
                          <option value="general">🎯 Tous les domaines</option>
                        </select>
                      </div>

                      {/* Difficulty Level */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: currentTheme.textSecondary,
                          marginBottom: '6px',
                        }}>
                          Niveau de difficulté préféré
                        </label>
                        <select
                          value={difficultyLevel}
                          onChange={(e) => setDifficultyLevel(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: currentTheme.border,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '8px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          <option value="beginner">🌱 Débutant</option>
                          <option value="intermediate">📚 Intermédiaire</option>
                          <option value="advanced">⭐ Avancé</option>
                          <option value="expert">🏆 Expert</option>
                        </select>
                      </div>

                      {/* Academy Notifications */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                            Notifications d'académie
                          </p>
                          <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: 0 }}>
                            Recevoir les rappels d'apprentissage
                          </p>
                        </div>
                        <button
                          onClick={() => setAcademyNotifications(!academyNotifications)}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: academyNotifications ? 'var(--ik-primary)' : '#6b7280',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: academyNotifications ? '20px' : '2px',
                              width: '20px',
                              height: '20px',
                              background: 'white',
                              borderRadius: '50%',
                              transition: 'left 0.3s ease',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SÉCURITÉ TAB */}
              {settingsTab === 'security' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🔐 Sécurité
                  </h3>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Changer le mot de passe
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Mettez à jour votre mot de passe
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Modifier
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Authentification 2FA
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        {userData?.enable2FA ? '✅ Activée' : 'Sécurité supplémentaire'}
                      </p>
                    </div>
                    <button
                      onClick={() => (userData?.enable2FA ? setTwoFAModal('disable') : startTwoFASetup())}
                      disabled={twoFALoading}
                      style={{
                        padding: '8px 16px',
                        background: userData?.enable2FA ? 'color-mix(in srgb, var(--ik-negative) 15%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                        border: `1px solid ${userData?.enable2FA ? 'color-mix(in srgb, var(--ik-negative) 30%, transparent)' : 'color-mix(in srgb, var(--ik-primary) 30%, transparent)'}`,
                        borderRadius: '8px',
                        color: userData?.enable2FA ? 'var(--ik-negative)' : currentTheme.accent,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: twoFALoading ? 'wait' : 'pointer',
                        opacity: twoFALoading ? 0.6 : 1,
                      }}
                    >
                      {twoFALoading ? '...' : userData?.enable2FA ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 12px 0' }}>
                      Sessions actives
                    </p>
                    <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                      Gérez vos sessions de connexion
                    </p>
                  </div>
                </div>
              )}

              {/* ALERTES TAB */}
              {settingsTab === 'alerts' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    🔔 Seuils d'Alertes Personnalisées
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: currentTheme.textSecondary,
                    margin: '0 0 12px 0',
                  }}>
                    Créez des alertes personnalisées basées sur vos critères
                  </p>

                  <button style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 20%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 20%, transparent) 100%)',
                    border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                    borderRadius: '8px',
                    color: currentTheme.accent,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 30%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 30%, transparent) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 20%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 20%, transparent) 100%)';
                  }}
                  >
                    + Créer une alerte
                  </button>

                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${currentTheme.border}`,
                    color: currentTheme.textSecondary,
                    fontSize: '12px',
                  }}>
                    Exemples: "Si Bitcoin +20%", "Si portefeuille baisse de 10%", "Si dividende reçu"
                  </div>
                </div>
              )}

              {/* DONNÉES TAB */}
              {settingsTab === 'privacy' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    📊 Données & Confidentialité
                  </h3>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Export mes données
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Téléchargez vos données personnelles
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Exporter
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${currentTheme.border}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        Politique de confidentialité
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                        Consultez nos conditions
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Lire
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ik-negative)', margin: '0 0 8px 0' }}>
                      ⚠️ Zone Danger
                    </p>
                    <button style={{
                      padding: '10px 20px',
                      background: 'color-mix(in srgb, var(--ik-negative) 15%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-negative) 30%, transparent)',
                      borderRadius: '8px',
                      color: 'var(--ik-negative)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Supprimer mon compte
                    </button>
                  </div>
                </div>
              )}

              {/* ABONNEMENT TAB */}
              {settingsTab === 'billing' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: currentTheme.text, margin: 0 }}>
                    💳 Abonnement
                  </h3>

                  {billingError && (
                    <p style={{ color: 'var(--ik-negative)', fontSize: '13px', margin: 0 }}>{billingError}</p>
                  )}

                  {userData?.subscriptionTier === 'pro' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 10%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 100%)',
                      border: '1px solid color-mix(in srgb, var(--ik-orchid) 30%, transparent)',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: currentTheme.text, margin: '0 0 4px 0' }}>
                          ✨ Abonnement Pro actif
                        </p>
                        <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: 0 }}>
                          Tous les domaines et fonctionnalités débloqués
                        </p>
                      </div>
                      <button
                        onClick={openBillingPortal}
                        disabled={billingLoading}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                          background: 'color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                          color: currentTheme.accent,
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: billingLoading ? 'wait' : 'pointer',
                        }}
                      >
                        {billingLoading ? '...' : 'Gérer mon abonnement'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '13px', color: currentTheme.textSecondary, margin: 0 }}>
                        Vous êtes actuellement sur le plan gratuit. Passez Pro pour débloquer tous les domaines et le portefeuille global.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{
                          padding: '20px',
                          borderRadius: '12px',
                          border: `1px solid ${currentTheme.border}`,
                          background: currentTheme.bg,
                          display: 'grid',
                          gap: '12px',
                        }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textSecondary, margin: 0, textTransform: 'uppercase' }}>Mensuel</p>
                          <p style={{ fontSize: '28px', fontWeight: '800', color: currentTheme.text, margin: 0 }}>{formatEuro(PRICES.monthly)}<span style={{ fontSize: '13px', fontWeight: '500', color: currentTheme.textSecondary }}>/mois</span></p>
                          <button
                            onClick={() => startCheckout('monthly')}
                            disabled={billingLoading}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1px solid ${currentTheme.border}`,
                              background: 'transparent',
                              color: currentTheme.text,
                              fontWeight: '600',
                              cursor: billingLoading ? 'wait' : 'pointer',
                            }}
                          >
                            Choisir
                          </button>
                        </div>
                        <div style={{
                          padding: '20px',
                          borderRadius: '12px',
                          border: '1px solid color-mix(in srgb, var(--ik-orchid) 40%, transparent)',
                          background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 8%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 8%, transparent) 100%)',
                          display: 'grid',
                          gap: '12px',
                          position: 'relative',
                        }}>
                          <span style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '16px',
                            background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
                            color: 'var(--ik-text-on-primary)',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '20px',
                          }}>
                            2 mois offerts
                          </span>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textSecondary, margin: 0, textTransform: 'uppercase' }}>Annuel</p>
                          <p style={{ fontSize: '28px', fontWeight: '800', color: currentTheme.text, margin: 0 }}>{formatEuro(PRICES.yearly)}<span style={{ fontSize: '13px', fontWeight: '500', color: currentTheme.textSecondary }}>/an</span></p>
                          <button
                            onClick={() => startCheckout('yearly')}
                            disabled={billingLoading}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
                              color: 'var(--ik-text-on-primary)',
                              fontWeight: '600',
                              cursor: billingLoading ? 'wait' : 'pointer',
                            }}
                          >
                            Choisir
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {userData?.referralCode && (
                    <div style={{
                      marginTop: '8px',
                      padding: '16px',
                      borderRadius: '12px',
                      border: `1px solid ${currentTheme.border}`,
                      background: currentTheme.bg,
                    }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: currentTheme.text, margin: '0 0 4px 0' }}>
                        🎁 Parraine tes amis
                      </p>
                      <p style={{ fontSize: '12px', color: currentTheme.textSecondary, margin: '0 0 12px 0' }}>
                        Tu reçois 100 InvestCoins pour chaque ami qui s'inscrit avec ton code et vérifie son email.
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: currentTheme.cardBg,
                          border: `1px solid ${currentTheme.border}`,
                          color: currentTheme.accent,
                          fontSize: '14px',
                          fontWeight: '700',
                          letterSpacing: '1px',
                        }}>
                          {userData.referralCode}
                        </code>
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/signup?ref=${userData.referralCode}`;
                            navigator.clipboard?.writeText(link).catch(() => {});
                          }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
                            color: 'var(--ik-text-on-primary)',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Copier le lien
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS SECTION */}
        {activeTab === 'notifications' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '900',
                color: currentTheme.text,
                margin: 0,
                letterSpacing: '-0.5px',
              }}>
                🔔 Notifications
              </h2>
              {notifications.some(n => !n.read) && (
                <button
                  onClick={() => {
                    setNotifications(notifications.map(n => ({ ...n, read: true })));
                    markNotificationsRead({ all: true });
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
                    borderRadius: '8px',
                    color: 'var(--ik-accent)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 25%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 15%, transparent)';
                  }}
                >
                  ✓ Marquer tout comme lu
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '60px 40px',
                  textAlign: 'center',
                  background: currentTheme.cardBg,
                  borderRadius: '16px',
                  border: `1px solid ${currentTheme.border}`,
                }}>
                  <p style={{ fontSize: '36px', margin: '0 0 16px 0' }}>✨</p>
                  <p style={{ color: currentTheme.textSecondary, margin: 0 }}>
                    Aucune notification pour le moment
                  </p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      setNotifications(notifications.map(n =>
                        n.id === notif.id ? { ...n, read: true } : n
                      ));
                      if (!notif.read) markNotificationsRead({ ids: [String(notif.id)] });
                      if (notif.link) router.push(notif.link);
                    }}
                    style={{
                      padding: '16px',
                      background: notif.read ? 'transparent' : `linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 10%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 5%, transparent) 100%)`,
                      borderRadius: '14px',
                      border: `1.5px solid ${notif.read ? currentTheme.border : 'color-mix(in srgb, var(--ik-primary) 20%, transparent)'}`,
                      backdropFilter: notif.read ? 'none' : 'blur(10px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      animation: !notif.read ? `fadeInUp 0.5s ease-out ${idx * 0.08}s both` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(8px)';
                      if (!notif.read) {
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-primary) 40%, transparent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      if (!notif.read) {
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-primary) 20%, transparent)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                        boxShadow: '0 8px 16px color-mix(in srgb, var(--ik-primary) 20%, transparent)',
                      }}>
                        {notif.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          color: currentTheme.text,
                          fontWeight: '600',
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                        }}>
                          {notif.user}
                        </p>
                        <p style={{
                          color: currentTheme.textSecondary,
                          fontSize: '12px',
                          margin: 0,
                        }}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: currentTheme.textSecondary,
                        whiteSpace: 'nowrap',
                      }}>
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                      {!notif.read && (
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: 'var(--ik-primary)',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* NEWS FEED MODAL */}
      {newsModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
        onClick={() => setNewsModalOpen(false)}
        >
          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-text) 8%, transparent) 0%, color-mix(in srgb, var(--ik-text) 3%, transparent) 100%)',
            borderRadius: '48px',
            padding: '16px',
            border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
            backdropFilter: 'blur(20px)',
            width: '100%',
            maxWidth: '600px',
            height: '800px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button onClick={() => setNewsModalOpen(false)} style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10,
              background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ik-text)',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 15%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 10%, transparent)';
            }}
            >
              ✕
            </button>

            {/* Tablet Bezel Top */}
            <div style={{
              background: 'linear-gradient(135deg, var(--ik-surface-2) 0%, #16213e 100%)',
              borderRadius: '36px 36px 0 0',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'var(--ik-text-2)',
            }}>
              <span>9:41</span>
              <span style={{ fontWeight: '700' }}>InvestKit</span>
              <span>📶 📡 🔋</span>
            </div>

            {/* Modal Tabs */}
            <div style={{
              background: 'linear-gradient(135deg, var(--ik-surface-2) 0%, #16213e 100%)',
              padding: '12px 20px',
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
            }}>
              <button
                onClick={() => setNewsModalTab('news')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: newsModalTab === 'news' ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'news' ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'news' ? 'var(--ik-accent)' : 'color-mix(in srgb, var(--ik-text) 50%, transparent)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                📰 Actualités
              </button>
              <button
                onClick={() => setNewsModalTab('tips')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: newsModalTab === 'tips' ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'tips' ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'tips' ? 'var(--ik-accent)' : 'color-mix(in srgb, var(--ik-text) 50%, transparent)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                💡 Conseils
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{
              background: 'linear-gradient(135deg, var(--ik-surface-2) 0%, #16213e 100%)',
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              scrollBehavior: 'smooth',
            }}>
              {newsModalTab === 'news' && (
                <>
                  {/* News Item 1 */}
                  <div style={{
                    background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)',
                    borderLeft: '4px solid var(--ik-primary)',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>📈</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: 'var(--ik-accent)',
                          margin: '0 0 4px 0',
                        }}>
                          CAC 40 en hausse
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--ik-text-2)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          L'indice gagne 1.2% aujourd'hui
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ik-text-3)',
                    }}>
                      À l'instant
                    </span>
                  </div>

                  {/* News Item 2 */}
                  <div style={{
                    background: 'color-mix(in srgb, var(--ik-positive) 15%, transparent)',
                    borderLeft: '4px solid var(--ik-positive)',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>💡</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#86efac',
                          margin: '0 0 4px 0',
                        }}>
                          Conseil du jour
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--ik-text-2)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Diversifiez pour réduire les risques
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ik-text-3)',
                    }}>
                      Il y a 2h
                    </span>
                  </div>

                  {/* News Item 3 */}
                  <div style={{
                    background: 'color-mix(in srgb, var(--ik-orchid) 15%, transparent)',
                    borderLeft: '4px solid var(--ik-orchid)',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>📚</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#d8b4fe',
                          margin: '0 0 4px 0',
                        }}>
                          Nouvelle formation
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--ik-text-2)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Maîtrisez la crypto
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ik-text-3)',
                    }}>
                      Il y a 5h
                    </span>
                  </div>

                  {/* News Item 4 */}
                  <div style={{
                    background: 'color-mix(in srgb, var(--ik-warning) 15%, transparent)',
                    borderLeft: '4px solid var(--ik-warning)',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#fcd34d',
                          margin: '0 0 4px 0',
                        }}>
                          Alerte BTC
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--ik-text-2)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Prix en baisse, opportunité?
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ik-text-3)',
                    }}>
                      Il y a 1h
                    </span>
                  </div>

                  {/* News Item 5 */}
                  <div style={{
                    background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)',
                    borderLeft: '4px solid var(--ik-primary)',
                    borderRadius: '16px',
                    padding: '18px',
                    flex: '0 0 auto',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>🏆</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: 'var(--ik-accent)',
                          margin: '0 0 4px 0',
                        }}>
                          Objectif atteint!
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--ik-text-2)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          +€5k de gains ce mois
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ik-text-3)',
                    }}>
                      Il y a 3h
                    </span>
                  </div>
                </>
              )}

              {newsModalTab === 'tips' && (
                <>
                  {dailyTips.map((tip) => (
                    <div
                      key={tip.id}
                      style={{
                        background: 'color-mix(in srgb, var(--ik-orchid) 15%, transparent)',
                        borderLeft: '4px solid var(--ik-orchid)',
                        borderRadius: '16px',
                        padding: '18px',
                        flex: '0 0 auto',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'start',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '24px', marginTop: '2px' }}>
                          {tip.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#d8b4fe',
                            margin: '0 0 4px 0',
                          }}>
                            {tip.title}
                          </p>
                          <p style={{
                            fontSize: '13px',
                            color: 'var(--ik-text-2)',
                            margin: 0,
                            lineHeight: '1.4',
                          }}>
                            {tip.tip}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--ik-text-3)',
                      }}>
                        Conseil quotidien
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Tablet Bezel Bottom */}
            <div style={{
              background: 'linear-gradient(135deg, var(--ik-surface-2) 0%, #16213e 100%)',
              borderRadius: '0 0 36px 36px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '180px',
                height: '5px',
                background: 'color-mix(in srgb, var(--ik-text) 20%, transparent)',
                borderRadius: '2px',
                margin: '0 auto',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* PROFILE CUSTOMIZATION MODAL */}
      {showProfileMenu && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 51,
        }}
        onClick={() => setShowProfileMenu(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-text) 95%, transparent) 0%, rgba(15, 52, 96, 0.95) 100%)',
            borderRadius: '20px',
            padding: '0',
            border: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)',
            backdropFilter: 'blur(20px)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '900',
                color: 'var(--ik-text)',
                margin: 0,
              }}>
                Mon Profil
              </h2>
              <button
                onClick={() => setShowProfileMenu(false)}
                style={{
                  background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ik-text)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 15%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 10%, transparent)';
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '0',
              padding: '0 24px',
              borderBottom: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}>
              {[
                { id: 'badges', label: '🏅 Badges', icon: '🏅' },
                { id: 'bio', label: '📝 Bio', icon: '📝' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProfileMenuTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: profileMenuTab === tab.id ? 'color-mix(in srgb, var(--ik-primary) 20%, transparent)' : 'transparent',
                    border: 'none',
                    borderBottom: profileMenuTab === tab.id ? '2px solid var(--ik-primary)' : '2px solid transparent',
                    color: profileMenuTab === tab.id ? 'var(--ik-accent)' : 'color-mix(in srgb, var(--ik-text) 50%, transparent)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (profileMenuTab !== tab.id) {
                      e.currentTarget.style.color = 'color-mix(in srgb, var(--ik-text) 70%, transparent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (profileMenuTab !== tab.id) {
                      e.currentTarget.style.color = 'color-mix(in srgb, var(--ik-text) 50%, transparent)';
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {profileMenuTab === 'badges' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--ik-text-2)',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      📦 Fond du Badge (Sélectionnez max 3 badges)
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginBottom: '16px',
                    }}>
                      {[
                        { id: 'blue', name: 'Bleu', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 10%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 100%)' },
                        { id: 'purple', name: 'Violet', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-orchid) 15%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 100%)' },
                        { id: 'gold', name: 'Or', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-warning) 10%, transparent) 0%, color-mix(in srgb, var(--ik-warning) 10%, transparent) 100%)' },
                        { id: 'green', name: 'Vert', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-positive) 10%, transparent) 0%, color-mix(in srgb, var(--ik-positive) 10%, transparent) 100%)' },
                        { id: 'pink', name: 'Rose', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 0%, rgba(190, 24, 93, 0.1) 100%)' },
                        { id: 'red', name: 'Rouge', value: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-negative) 10%, transparent) 0%, rgba(190, 24, 93, 0.1) 100%)' },
                      ].map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setBadgeBackgroundColor(color.value)}
                          style={{
                            padding: '12px',
                            background: color.value,
                            border: badgeBackgroundColor === color.value ? '2px solid var(--ik-accent)' : '2px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
                            borderRadius: '12px',
                            color: 'var(--ik-text-2)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--ik-text-2)',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      🏅 Vos Badges ({selectedDisplayBadges.length}/3)
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                      gap: '12px',
                    }}>
                      {userBadges.map((badgeId) => {
                        const badge = badgeDefinitions[badgeId];
                        if (!badge) return null;
                        const isSelected = selectedDisplayBadges.includes(badgeId);
                        const rarityColors = {
                          common: 'var(--ik-text-3)',
                          rare: 'var(--ik-primary)',
                          very_rare: 'var(--ik-orchid)',
                          unique: 'var(--ik-warning)',
                        };
                        return (
                          <button
                            key={badgeId}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedDisplayBadges(selectedDisplayBadges.filter(b => b !== badgeId));
                              } else if (selectedDisplayBadges.length < 3) {
                                setSelectedDisplayBadges([...selectedDisplayBadges, badgeId]);
                              }
                            }}
                            style={{
                              padding: '12px',
                              background: isSelected ? `${alpha(rarityColors[badge.rarity], 19)}` : 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                              border: `2px solid ${isSelected ? rarityColors[badge.rarity] : 'color-mix(in srgb, var(--ik-text) 10%, transparent)'}`,
                              borderRadius: '12px',
                              textAlign: 'center',
                              cursor: selectedDisplayBadges.length >= 3 && !isSelected ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: selectedDisplayBadges.length >= 3 && !isSelected ? 0.5 : 1,
                            }}
                          >
                            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{badge.emoji}</div>
                            <p style={{
                              fontSize: '9px',
                              color: rarityColors[badge.rarity],
                              fontWeight: '600',
                              margin: 0,
                            }}>
                              {badge.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {profileMenuTab === 'bio' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--ik-text-2)',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    📝 Ma Bio
                  </label>
                  <textarea
                    value={bioEditInput}
                    onChange={(e) => setBioEditInput(e.target.value.slice(0, 150))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                      borderRadius: '12px',
                      color: 'var(--ik-text)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      minHeight: '100px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-primary) 50%, transparent)';
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-primary) 5%, transparent)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-text) 10%, transparent)';
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 5%, transparent)';
                    }}
                    placeholder="Parlez-nous de vous..."
                  />
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--ik-text-3)',
                    margin: '6px 0 0 0',
                  }}>
                    {bioEditInput.length}/150 caractères
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Save Button */}
            <div style={{
              padding: '24px',
              borderTop: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowProfileMenu(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                  borderRadius: '10px',
                  color: 'var(--ik-text-3)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 10%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--ik-text) 5%, transparent)';
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setUserBio(bioEditInput);
                  setShowProfileMenu(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 30%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 30%, transparent) 100%)',
                  border: '2px solid color-mix(in srgb, var(--ik-primary) 50%, transparent)',
                  borderRadius: '10px',
                  color: 'var(--ik-accent)',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 40%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 40%, transparent) 100%)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-primary) 70%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 30%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 30%, transparent) 100%)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ik-primary) 50%, transparent)';
                }}
              >
                ✓ Sauvegarder & Synchroniser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Animation */}
      {showConfetti && (
        <>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'fixed',
                left: Math.random() * 100 + '%',
                top: '-10px',
                width: '10px',
                height: '10px',
                background: ['var(--ik-primary)', 'var(--ik-orchid)', '#ec4899', 'var(--ik-warning)', 'var(--ik-positive)'][Math.floor(Math.random() * 5)],
                borderRadius: '50%',
                animation: `fall 3s linear forwards`,
                pointerEvents: 'none',
              }}
            />
          ))}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </>
      )}

      {/* Achievement Notification */}
      {newAchievement && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            animation: 'slideDown 0.5s ease-out, slideUp 0.5s ease-in 3.5s forwards',
          }}
        >
          <div style={{
            padding: '20px 32px',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-primary) 95%, transparent) 0%, color-mix(in srgb, var(--ik-orchid) 95%, transparent) 100%)',
            borderRadius: '12px',
            border: '2px solid color-mix(in srgb, var(--ik-text) 30%, transparent)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px color-mix(in srgb, var(--ik-primary) 40%, transparent)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '12px',
              animation: 'bounce 0.6s ease-in-out',
            }}>
              {newAchievement.icon}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '800',
              color: 'var(--ik-text)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              {newAchievement.title}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--ik-text)',
              marginBottom: '8px',
            }}>
              {newAchievement.description}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: 'var(--ik-warning)',
            }}>
              {newAchievement.reward}
            </div>
          </div>
          <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px);
              }
              to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
              }
            }
            @keyframes slideUp {
              from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
              }
              to {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px);
              }
            }
            @keyframes bounce {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.2);
              }
            }
          `}</style>
        </div>
      )}

      {/* PUSH NOTIFICATIONS - Système de notifications pop-up en temps réel */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'grid',
        gap: '12px',
        maxWidth: '360px',
      }}>
        {pushNotifications.map((notif, idx) => (
          <div
            key={notif.id}
            style={{
              padding: '16px',
              background: `linear-gradient(135deg, ${
                notif.type === 'success' ? 'color-mix(in srgb, var(--ik-positive) 15%, transparent)' :
                notif.type === 'follow' ? 'color-mix(in srgb, var(--ik-primary) 15%, transparent)' :
                notif.type === 'achievement' ? 'color-mix(in srgb, var(--ik-warning) 15%, transparent)' :
                notif.type === 'guild_join' ? 'color-mix(in srgb, var(--ik-orchid) 15%, transparent)' :
                'color-mix(in srgb, var(--ik-primary) 15%, transparent)'
              } 0%, ${
                notif.type === 'success' ? 'color-mix(in srgb, var(--ik-positive) 5%, transparent)' :
                notif.type === 'follow' ? 'color-mix(in srgb, var(--ik-primary) 5%, transparent)' :
                notif.type === 'achievement' ? 'color-mix(in srgb, var(--ik-warning) 5%, transparent)' :
                notif.type === 'guild_join' ? 'color-mix(in srgb, var(--ik-orchid) 5%, transparent)' :
                'color-mix(in srgb, var(--ik-primary) 5%, transparent)'
              } 100%)`,
              border: `1.5px solid ${
                notif.type === 'success' ? 'color-mix(in srgb, var(--ik-positive) 30%, transparent)' :
                notif.type === 'follow' ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' :
                notif.type === 'achievement' ? 'color-mix(in srgb, var(--ik-warning) 30%, transparent)' :
                notif.type === 'guild_join' ? 'color-mix(in srgb, var(--ik-orchid) 30%, transparent)' :
                'color-mix(in srgb, var(--ik-primary) 30%, transparent)'
              }`,
              borderRadius: '14px',
              backdropFilter: 'blur(10px)',
              boxShadow: `0 12px 32px rgba(0, 0, 0, 0.3)`,
              animation: `slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            onClick={() => {
              setPushNotifications(prev => prev.filter(p => p.id !== notif.id));
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>
                {notif.type === 'success' ? '🎉' :
                 notif.type === 'follow' ? '👤' :
                 notif.type === 'achievement' ? '🏆' :
                 notif.type === 'guild_join' ? '👥' :
                 '🔔'}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  color: currentTheme.text,
                  fontWeight: '700',
                  margin: '0 0 4px 0',
                  fontSize: '13px',
                }}>
                  {notif.title}
                </p>
                <p style={{
                  color: currentTheme.textSecondary,
                  fontSize: '12px',
                  margin: 0,
                }}>
                  {notif.message}
                </p>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.textSecondary,
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPushNotifications(prev => prev.filter(p => p.id !== notif.id));
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* NEW: Badge Unlock Toast Notifications */}
      <div style={{
        position: 'fixed',
        bottom: '84px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {badgeUnlockToasts.map(toast => (
          <div key={toast.id} style={{
            background: 'var(--ik-surface-card)',
            border: '1px solid var(--ik-primary)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            animation: 'toastSlideIn 0.4s ease-out',
            pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: '32px' }}>{toast.badgeEmoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--ik-text)',
                marginBottom: '4px',
              }}>🎉 Nouveau Badge!</div>
              <div style={{
                fontSize: '13px',
                color: 'var(--ik-text)',
                marginBottom: '2px',
              }}>{toast.badgeName}</div>
              <div style={{
                fontSize: '11px',
                color: 'var(--ik-text-2)',
              }}>+{toast.xp} XP • {toast.rarity.replace('_', ' ').toUpperCase()}</div>
            </div>
            <div style={{
              fontSize: '20px',
              animation: 'milestoneCelebrate 0.6s ease-out',
            }}>✨</div>
          </div>
        ))}
      </div>

      {/* NEW: Confetti Particles */}
      {badgeConfetti.map(piece => (
        <div key={piece.id} style={{
          position: 'fixed',
          left: `${piece.left}%`,
          bottom: '-10px',
          width: '12px',
          height: '12px',
          background: piece.color,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9998,
          animation: `confetti-fall ${piece.duration}s ease-in`,
          animationDelay: `${piece.delay}s`,
          boxShadow: `0 0 8px ${piece.color}`,
        }} />
      ))}

      {/* NEW: Badge Album Modal */}
      {showBadgeAlbum && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowBadgeAlbum(false)}>
          <div style={{
            background: 'linear-gradient(135deg, var(--ik-surface-2) 0%, #16213e 100%)',
            border: '2px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{
                margin: 0,
                color: 'var(--ik-text)',
                fontSize: '24px',
                fontWeight: '700',
              }}>
                📖 Album de Badges
              </h2>
              <button onClick={() => setShowBadgeAlbum(false)} style={{
                background: 'none',
                border: 'none',
                color: 'var(--ik-text)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: 0,
              }}>✕</button>
            </div>

            {/* Stats */}
            <div style={{
              background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: 'var(--ik-text-2)',
            }}>
              <strong>{userBadges.length} / {Object.keys(badgeDefinitions).length}</strong> badges collectés ({Math.round((userBadges.length / Object.keys(badgeDefinitions).length) * 100)}%)
            </div>

            {/* Detailed Statistics Section */}
            <div style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--ik-orchid) 10%, transparent) 0%, color-mix(in srgb, var(--ik-warning) 10%, transparent) 100%)',
              border: '1px solid color-mix(in srgb, var(--ik-orchid) 20%, transparent)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                color: 'var(--ik-text)',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>📊 Statistiques de Collection</h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
              }}>
                {[
                  { label: 'Unique', count: userBadges.filter(id => badgeDefinitions[id]?.rarity === 'unique').length, color: 'var(--ik-warning)' },
                  { label: 'Très Rare', count: userBadges.filter(id => badgeDefinitions[id]?.rarity === 'very_rare').length, color: 'var(--ik-accent)' },
                  { label: 'Rare', count: userBadges.filter(id => badgeDefinitions[id]?.rarity === 'rare').length, color: 'var(--ik-accent)' },
                  { label: 'Commun', count: userBadges.filter(id => badgeDefinitions[id]?.rarity === 'common').length, color: 'var(--ik-text-3)' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    borderLeft: `3px solid ${stat.color}`,
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                      {stat.count}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ik-text-3)' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              overflowX: 'auto',
            }}>
              {['all', 'obtained', 'locked', 'seasonal', 'secret'].map(filter => (
                <button key={filter} onClick={() => setBadgeAlbumFilter(filter)} style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: badgeAlbumFilter === filter ? '2px solid var(--ik-warning)' : '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
                  background: badgeAlbumFilter === filter ? 'color-mix(in srgb, var(--ik-warning) 20%, transparent)' : 'color-mix(in srgb, var(--ik-text) 5%, transparent)',
                  color: badgeAlbumFilter === filter ? 'var(--ik-warning)' : 'color-mix(in srgb, var(--ik-text) 60%, transparent)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Badge Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px',
            }}>
              {Object.entries(badgeDefinitions).map(([badgeId, badge]) => {
                const isObtained = userBadges.includes(badgeId);
                const shouldShow = badgeAlbumFilter === 'all' ||
                  (badgeAlbumFilter === 'obtained' && isObtained) ||
                  (badgeAlbumFilter === 'locked' && !isObtained) ||
                  (badgeAlbumFilter === 'seasonal' && badge.category === 'seasonal') ||
                  (badgeAlbumFilter === 'secret' && badge.category === 'secret');

                if (!shouldShow) return null;

                const isPinned = pinnedBadges.includes(badgeId);
                return (
                  <div key={badgeId} style={{
                    position: 'relative',
                  }}>
                    <div style={{
                      background: getBadgeRarityColor(badge.rarity),
                      border: getBadgeRarityBorder(badge.rarity),
                      borderRadius: '12px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: isObtained ? 1 : 0.5,
                      transform: hoveredBadge === badgeId ? 'scale(1.08)' : 'scale(1)',
                      position: 'relative',
                      boxShadow: isPinned ? `0 0 12px ${badgeDefinitions[badgeId]?.rarity === 'unique' ? 'var(--ik-warning)' : 'var(--ik-orchid)'}` : 'none',
                    }}
                    onMouseEnter={() => setHoveredBadge(badgeId)}
                    onMouseLeave={() => setHoveredBadge(null)}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                        {badge.emoji}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--ik-text)',
                        marginBottom: '4px',
                      }}>
                        {badge.name}
                      </div>
                      <div style={{
                        fontSize: '8px',
                        fontWeight: '600',
                        color: badge.rarity === 'unique' ? 'var(--ik-warning)' : badge.rarity === 'very_rare' ? 'var(--ik-orchid)' : badge.rarity === 'rare' ? 'var(--ik-primary)' : 'var(--ik-text-3)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}>
                        {badge.rarity.replace('_', ' ')}
                      </div>
                      {!isObtained && badgeUnlockProgress[badgeId] && badgeUnlockProgress[badgeId].percent > 0 && (
                        <div style={{
                          fontSize: '9px',
                          color: 'var(--ik-text-3)',
                          marginTop: '4px',
                        }}>
                          {badgeUnlockProgress[badgeId].percent}% progressé
                        </div>
                      )}
                      {isObtained && badgeDateObtained[badgeId] && (
                        <div style={{
                          fontSize: '8px',
                          color: 'var(--ik-text-3)',
                          marginTop: '4px',
                        }}>
                          {new Date(badgeDateObtained[badgeId]).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>

                    {/* Pin Button - Show on hover for obtained badges */}
                    {isObtained && hoveredBadge === badgeId && (
                      <button
                        onClick={() => togglePinnedBadge(badgeId)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isPinned ? 'var(--ik-warning)' : 'color-mix(in srgb, var(--ik-text) 20%, transparent)',
                          border: `2px solid ${isPinned ? 'var(--ik-warning)' : 'color-mix(in srgb, var(--ik-text) 40%, transparent)'}`,
                          color: isPinned ? '#000' : '#fff',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          zIndex: 10,
                        }}
                        title={isPinned ? 'Débloquer' : 'Épingler'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {isPinned ? '📌' : '📍'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL 2FA ============ */}
      {twoFAModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
          onClick={closeTwoFAModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {twoFAModal === 'setup' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: currentTheme.text }}>
                  🔐 Activer la 2FA
                </h3>
                <p style={{ fontSize: '13px', color: currentTheme.textSecondary, margin: '0 0 16px' }}>
                  Scannez ce QR code avec Google Authenticator, Authy ou une app équivalente.
                </p>
                {twoFAQrCode && (
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <img src={twoFAQrCode} alt="QR code 2FA" style={{ width: '180px', height: '180px', borderRadius: '8px' }} />
                  </div>
                )}
                <p style={{ fontSize: '11px', color: currentTheme.textSecondary, textAlign: 'center', marginBottom: '16px', wordBreak: 'break-all' }}>
                  Ou entrez manuellement : <code>{twoFASecret}</code>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Code à 6 chiffres"
                  value={twoFACodeInput}
                  onChange={(e) => setTwoFACodeInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.border}`,
                    background: currentTheme.bg,
                    color: currentTheme.text,
                    fontSize: '16px',
                    textAlign: 'center',
                    letterSpacing: '4px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                {twoFAError && <p style={{ color: 'var(--ik-negative)', fontSize: '13px', margin: '0 0 12px' }}>{twoFAError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={closeTwoFAModal} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, background: 'transparent', color: currentTheme.text, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button
                    onClick={confirmTwoFASetup}
                    disabled={twoFALoading || twoFACodeInput.length !== 6}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
                      color: 'var(--ik-text-on-primary)',
                      fontWeight: 600,
                      cursor: twoFACodeInput.length === 6 ? 'pointer' : 'not-allowed',
                      opacity: twoFACodeInput.length === 6 ? 1 : 0.5,
                    }}
                  >
                    {twoFALoading ? '...' : 'Confirmer'}
                  </button>
                </div>
              </>
            )}

            {twoFAModal === 'backup-codes' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: currentTheme.text }}>
                  ✅ 2FA activée !
                </h3>
                <p style={{ fontSize: '13px', color: currentTheme.textSecondary, margin: '0 0 16px' }}>
                  Notez ces 8 codes de secours dans un endroit sûr. Chacun ne fonctionne qu'une seule fois, en cas de perte de votre téléphone.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: currentTheme.bg,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  {twoFABackupCodes.map((code) => (
                    <code key={code} style={{ fontSize: '13px', color: currentTheme.text }}>{code}</code>
                  ))}
                </div>
                <button
                  onClick={closeTwoFAModal}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)', color: 'var(--ik-text-on-primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  J'ai noté mes codes
                </button>
              </>
            )}

            {twoFAModal === 'disable' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: currentTheme.text }}>
                  Désactiver la 2FA
                </h3>
                <p style={{ fontSize: '13px', color: currentTheme.textSecondary, margin: '0 0 16px' }}>
                  Confirmez votre mot de passe pour désactiver la double authentification.
                </p>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={twoFADisablePassword}
                  onChange={(e) => setTwoFADisablePassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.border}`,
                    background: currentTheme.bg,
                    color: currentTheme.text,
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                {twoFAError && <p style={{ color: 'var(--ik-negative)', fontSize: '13px', margin: '0 0 12px' }}>{twoFAError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={closeTwoFAModal} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, background: 'transparent', color: currentTheme.text, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button
                    onClick={confirmTwoFADisable}
                    disabled={twoFALoading || !twoFADisablePassword}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--ik-negative)',
                      color: 'var(--ik-text-on-negative)',
                      fontWeight: 600,
                      cursor: twoFADisablePassword ? 'pointer' : 'not-allowed',
                      opacity: twoFADisablePassword ? 1 : 0.5,
                    }}
                  >
                    {twoFALoading ? '...' : 'Désactiver'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
