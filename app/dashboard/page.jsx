'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEducationProgress } from '@/app/context/EducationContext';
import { useUser } from '@/app/context/UserContext';
import { educationDomains } from '@/data/education';

export default function DashboardPage() {
  const router = useRouter();
  const { progress, isDomainCompleted, getDomainProgress } = useEducationProgress();
  const { user: userData, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProject, setExpandedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalTab, setNewsModalTab] = useState('news');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [settingsTab, setSettingsTab] = useState('general');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fullName, setFullName] = useState('Jean Dupont');
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
  const [userGuildes, setUserGuildes] = useState([1]); // Guildes auxquelles l'utilisateur a rejoint (commencer avec guilde 1)
  const [guildMessage, setGuildMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [guildChatInput, setGuildChatInput] = useState(''); // Message input pour le chat de guilde
  const [memberActionMenu, setMemberActionMenu] = useState(null); // { guildId, memberId } pour afficher menu d'action
  const [roleChangeMenu, setRoleChangeMenu] = useState(null); // { guildId, memberId } pour changer de rôle
  const [guildes, setGuildes] = useState([
    {
      id: 1,
      name: '₿ Crypto Traders',
      emoji: '₿',
      description: 'Groupe pour les traders crypto',
      level: 8,
      totalXP: 4200,
      restrictions: { minLevel: 5, requiredBadges: ['crypto_master'] },
      membersList: [
        { id: 0, name: 'SMC.SRB', level: 20, role: 'Leader', joinedDate: '2026-01-01' },
        { id: 1, name: 'Alice Dupont', level: 5, role: 'Co-leader', joinedDate: '2026-01-15' },
        { id: 2, name: 'Bob Martin', level: 8, role: 'Elder', joinedDate: '2026-02-10' },
        { id: 3, name: 'David Lemoine', level: 6, role: 'Member', joinedDate: '2026-03-05' },
        { id: 4, name: 'Emma Leclerc', level: 9, role: 'Member', joinedDate: '2026-03-20' },
        { id: 5, name: 'Clara Rousseau', level: 3, role: 'Member', joinedDate: '2026-04-01' },
      ],
      chat: [
        { id: 1, author: 'Alice Dupont', message: 'Bienvenue à tous!', timestamp: '2026-09-20 10:15' },
        { id: 2, author: 'Bob Martin', message: 'Complétez vos domaines pour débloquer les perks!', timestamp: '2026-09-20 11:30' },
        { id: 3, author: 'David Lemoine', message: 'Qui veut participer à la quête cette semaine?', timestamp: '2026-09-20 14:45' },
      ]
    },
    {
      id: 2,
      name: '📈 Stock Masters',
      emoji: '📈',
      description: 'Investisseurs en bourse',
      level: 5,
      totalXP: 2800,
      restrictions: { minLevel: 4, minStocksProgress: 60 },
      membersList: [
        { id: 6, name: 'Emma Leclerc', level: 9, role: 'Leader', joinedDate: '2026-02-01' },
        { id: 2, name: 'Bob Martin', level: 8, role: 'Member', joinedDate: '2026-02-15' },
        { id: 3, name: 'David Lemoine', level: 6, role: 'Member', joinedDate: '2026-03-01' },
      ],
      chat: [
        { id: 1, author: 'Emma Leclerc', message: 'Bienvenue!', timestamp: '2026-09-20 09:00' },
        { id: 2, author: 'Bob Martin', message: 'Analyse tech du jour?', timestamp: '2026-09-20 13:20' },
      ]
    },
  ]);
  const [showCreateGuilde, setShowCreateGuilde] = useState(false);
  const [newGuildeName, setNewGuildeName] = useState('');
  const [newGuildeDesc, setNewGuildeDesc] = useState('');
  const [guildeRestrictions, setGuildeRestrictions] = useState({
    minLevel: 1,
    minXP: 0,
    requiredBadges: [],
    domainRequirements: {}, // { 'crypto': 50, 'stocks': 30 }
  });

  // Mock users database with detailed profiles
  const [availableUsers] = useState([
    {
      friendCode: '#ABC123', name: 'Alice Dupont', level: 5, xp: 2500, avatar: '👩‍💼',
      completedDomains: ['crypto', 'stocks'], domainsProgress: { crypto: 100, stocks: 60, realestate: 30 },
      badges: ['first_blood', 'perfect', 'no_mistakes'],
      portfolio: 15000, bio: 'Investisseuse en crypto passionnée'
    },
    {
      friendCode: '#XYZ789', name: 'Bob Martin', level: 8, xp: 4200, avatar: '👨‍💻',
      completedDomains: ['crypto', 'stocks', 'bonds'], domainsProgress: { crypto: 100, stocks: 100, bonds: 75, realestate: 40 },
      badges: ['first_blood', 'perfect', 'no_mistakes', 'crypto_master'],
      portfolio: 32000, bio: 'Trader expérimenté, focus sur l\'analyse technique'
    },
    {
      friendCode: '#DEF456', name: 'Clara Rousseau', level: 3, xp: 1500, avatar: '👩‍🎓',
      completedDomains: ['crypto'], domainsProgress: { crypto: 45, stocks: 10 },
      badges: ['first_blood'],
      portfolio: 5000, bio: 'Débutante mais motivée !'
    },
    {
      friendCode: '#GHI321', name: 'David Lemoine', level: 6, xp: 3100, avatar: '👨‍🎯',
      completedDomains: ['crypto', 'realestate'], domainsProgress: { crypto: 100, realestate: 85, stocks: 50 },
      badges: ['first_blood', 'perfect'],
      portfolio: 28000, bio: 'Spécialiste en immobilier'
    },
    {
      friendCode: '#JKL654', name: 'Emma Leclerc', level: 9, xp: 5000, avatar: '👩‍💰',
      completedDomains: ['crypto', 'stocks', 'bonds', 'realestate'], domainsProgress: { crypto: 100, stocks: 100, bonds: 100, realestate: 95 },
      badges: ['first_blood', 'perfect', 'no_mistakes', 'crypto_master', 'stocks_master'],
      portfolio: 55000, bio: 'Expert en gestion de portefeuille diversifié'
    },
  ]);

  const searchUsers = availableUsers.filter(
    (user) =>
      user.friendCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleJoinGuilde = (guilde) => {
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

  const theme = {
    dark: {
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      cardBg: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textTertiary: 'rgba(255, 255, 255, 0.5)',
      border: 'rgba(255, 255, 255, 0.1)',
      accent: '#3b82f6',
    },
    light: {
      bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f0f4f8 100%)',
      cardBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
      text: '#1e293b',
      textSecondary: 'rgba(30, 41, 59, 0.6)',
      textTertiary: 'rgba(30, 41, 59, 0.5)',
      border: 'rgba(30, 41, 59, 0.1)',
      accent: '#2563eb',
    },
  };

  const currentTheme = isDarkMode ? theme.dark : theme.light;

  const [portfolioData] = useState({
    totalValue: 245680.50,
    dayChange: 1245.30,
    dayChangePercent: 0.51,
    weekChange: 3420.75,
    monthChange: 8560.45,
    yearGain: 32450.20,
    ytdReturn: 18.3,
    totalInvested: 213230.30,
    unrealizedGain: 32450.20,
    sharpeRatio: 1.45,
    volatility: 12.3,
    maxDrawdown: -8.5,
    winRate: 72.5,
  });

  const [portfolioMetrics] = useState({
    beta: 0.85,
    alpha: 2.34,
    treynorRatio: 0.42,
    sortinoRatio: 2.15,
    informationRatio: 1.68,
    rsquared: 0.78,
  });

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

  const [notifications] = useState([
    { id: 1, type: 'alert', title: 'Rebalancement Recommandé', message: 'Allocation dérivée de 3%', time: 'il y a 2h', severity: 'high' },
    { id: 2, type: 'info', title: 'Dividende Reçu', message: '€145.50 versé sur PEA', time: 'il y a 4h', severity: 'medium' },
    { id: 3, type: 'alert', title: 'Volatilité Élevée', message: 'BTC +5.2% aujourd\'hui', time: 'il y a 6h', severity: 'medium' },
  ]);

  const [projects] = useState([
    {
      id: 1,
      name: 'Investissement Immobilier - Premier Appart',
      type: 'immobilier',
      currentValue: 268500,
      yearGain: 18500,
      allocation: '45%',
      projectedReturn: 18,
      riskLevel: 'modéré',
    },
    {
      id: 2,
      name: 'Portefeuille Crypto Diversifié',
      type: 'crypto',
      currentValue: 21750,
      yearGain: 6750,
      allocation: '12%',
      projectedReturn: 45,
      riskLevel: 'élevé',
    },
    {
      id: 3,
      name: 'PEA Multi-Secteurs',
      type: 'pea',
      currentValue: 84430.50,
      yearGain: 9430.50,
      allocation: '35%',
      projectedReturn: 12,
      riskLevel: 'faible',
    },
  ]);

  const [marketData] = useState([
    { name: 'CAC 40', value: 7425.38, change: 0.75 },
    { name: 'BTC/EUR', value: 68450.50, change: 3.53 },
    { name: 'ETH/EUR', value: 2850.75, change: 5.36 },
    { name: 'Or ($/oz)', value: 2095.30, change: 1.72 },
  ]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }

    // Load theme preference
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'light') {
      setIsDarkMode(false);
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

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.bg,
      color: currentTheme.text,
      display: 'grid',
      gridTemplateColumns: sidebarOpen ? '280px 1fr' : '1fr',
      gap: '24px',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
      `}</style>

      {/* SIDEBAR TOGGLE BUTTON */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
        position: 'fixed',
        top: '24px',
        left: '24px',
        zIndex: 40,
        background: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#60a5fa',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.3)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.2)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* LEFT SIDEBAR */}
      {sidebarOpen && <div style={{
        borderRight: `1px solid ${currentTheme.border}`,
        paddingRight: '24px',
        height: 'fit-content',
      }}>
        {/* User Profile */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: photoPreview ? 'transparent' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            overflow: 'hidden',
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
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: currentTheme.text,
            margin: '0 0 4px 0',
          }}>
            {fullName}
          </h3>
          <p style={{
            fontSize: '12px',
            color: currentTheme.textSecondary,
            margin: 0,
          }}>
            Investisseur Premium
          </p>
        </div>

        {/* Friend Code Section */}
        <div style={{ marginBottom: '40px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Mon Code Ami
          </p>
          <p style={{
            fontSize: '18px',
            fontWeight: '900',
            color: '#60a5fa',
            margin: '0 0 12px 0',
            fontFamily: 'monospace',
          }}>
            {userData.friendCode}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => copyToClipboard(userData.friendCode)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                border: copied ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '8px',
                color: copied ? '#10b981' : '#60a5fa',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Aperçu
          </p>
          {[
            { label: 'Portefeuille', value: '€' + (portfolioData.totalValue / 1000).toFixed(0) + 'k', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            { label: 'Gain YTD', value: '+' + portfolioData.ytdReturn + '%', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            { label: 'Projets', value: projects.length, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              padding: '16px',
              background: stat.bg,
              borderRadius: '12px',
              marginBottom: '12px',
              borderLeft: `3px solid ${stat.color}`,
            }}>
              <p style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0 0 4px 0',
                fontWeight: '600',
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '20px',
                fontWeight: '900',
                color: stat.color,
                margin: 0,
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Menu
          </p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              { id: 'overview', label: '📊 Vue d\'ensemble' },
              { id: 'projects', label: '🎯 Projets' },
              { id: 'market', label: '💹 Marché' },
              { id: 'education', label: '📚 Académie' },
              { id: 'friends', label: `👥 Amis (${userData.friends.length})` },
              { id: 'risk', label: '⚠️ Risques' },
              { id: 'settings', label: '⚙️ Paramètres' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: activeTab === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: activeTab === item.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '14px',
                  fontWeight: activeTab === item.id ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.id) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.id) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Info */}
        <div style={{
          padding: '16px',
          background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(30, 41, 59, 0.05)',
          borderRadius: '12px',
          borderTop: `1px solid ${currentTheme.border}`,
        }}>
          <p style={{
            fontSize: '11px',
            color: currentTheme.textTertiary,
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}>
            Membre depuis
          </p>
          <p style={{
            fontSize: '13px',
            color: currentTheme.textSecondary,
            margin: '0 0 12px 0',
            fontWeight: '700',
          }}>
            3 ans
          </p>
          <div style={{
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '8px',
            borderLeft: '2px solid #10b981',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#10b981',
              margin: 0,
              fontWeight: '700',
            }}>
              ✓ KYC Vérifié
            </p>
          </div>
        </div>
      </div>}

      {/* MAIN CONTENT - CENTER COLUMN */}
      <div className="dashboard-content" style={{}}>
        {/* HEADER */}
        <div style={{
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              color: currentTheme.text,
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px',
            }}>
              Votre Portefeuille
            </h1>
            <p style={{
              color: currentTheme.textSecondary,
              margin: 0,
              fontSize: '14px',
            }}>
              Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
            </p>
          </div>

          {/* News Modal Button */}
          <button onClick={() => setNewsModalOpen(true)} style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            color: '#60a5fa',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
          >
            📰 Actualités
          </button>
        </div>

        {/* MAIN PORTFOLIO CARD - BANK CARD STYLE */}
        {activeTab === 'overview' && (
          <>
            <div className="metric-card" style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              borderRadius: '24px',
              padding: '0',
              marginBottom: '32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '500px',
              aspectRatio: '1.7',
            }}>
              {/* Card Background Effects */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                pointerEvents: 'none',
              }} />

              {/* Decorative Elements */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Card Content */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
              }}>
                {/* Top Section - Card Type & Logo */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '20px',
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      INVESTKIT PREMIUM
                    </p>
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '900',
                  }}>
                    💳
                  </div>
                </div>

                {/* Middle Section - Card Number Placeholder */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  margin: '20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                }}>
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>2024</span>
                </div>

                {/* Bottom Section - Holder & Date */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: 'auto',
                }}>
                  <div>
                    <p style={{
                      fontSize: '9px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      CARDHOLDER
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'white',
                      margin: 0,
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}>
                      {fullName.toUpperCase()}
                    </p>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <p style={{
                      fontSize: '9px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Valid Thru
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: 'white',
                      margin: 0,
                      fontWeight: '700',
                      fontFamily: 'monospace',
                    }}>
                      12/26
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PORTFOLIO STATS BELOW CARD */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {/* Total Balance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Solde Total
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#60a5fa',
                  margin: '0 0 12px 0',
                }}>
                  €{portfolioData.totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: '700',
                  }}>
                    ↑ +€{portfolioData.dayChange.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}>
                    ({portfolioData.dayChangePercent}% today)
                  </span>
                </div>
              </div>

              {/* Available Balance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Gain Année (YTD)
                </p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#86efac',
                  margin: '0 0 12px 0',
                }}>
                  +{portfolioData.ytdReturn}%
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: 0,
                }}>
                  €{portfolioData.yearGain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} gains réalisés
                </p>
              </div>

              {/* Performance */}
              <div className="metric-card" style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 8px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Performance
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginTop: '12px',
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      Win Rate
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#a78bfa',
                      margin: '4px 0 0 0',
                    }}>
                      {portfolioData.winRate}%
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      Capital
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      color: '#c4b5fd',
                      margin: '4px 0 0 0',
                    }}>
                      €{(portfolioData.totalInvested / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PROJECTS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 16px 0',
              }}>
                🎯 Vos Projets
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
              }}>
                {projects.map((project) => (
                  <div key={project.id} className="metric-card" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'white',
                        margin: '0 0 4px 0',
                      }}>
                        {project.name}
                      </h3>
                      <p style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        fontWeight: '600',
                      }}>
                        {project.type} • {project.allocation} allocation
                      </p>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 0 4px 0',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Valeur
                        </p>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#60a5fa',
                          margin: 0,
                        }}>
                          €{(project.currentValue / 1000).toFixed(0)}k
                        </p>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 0 4px 0',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Gain Annuel
                        </p>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#86efac',
                          margin: 0,
                        }}>
                          +€{(project.yearGain / 1000).toFixed(1)}k
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: 0,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Risque
                        </p>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: project.riskLevel === 'élevé' ? '#f43f5e' : project.riskLevel === 'modéré' ? '#f59e0b' : '#10b981',
                          margin: '2px 0 0 0',
                        }}>
                          {project.riskLevel}
                        </p>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: 0,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          Retour
                        </p>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#a78bfa',
                          margin: '2px 0 0 0',
                        }}>
                          {project.projectedReturn}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ANALYSIS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 16px 0',
              }}>
                📊 Analyse Détaillée
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {/* Risk Metrics */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    ⚖️ Risque
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Sharpe Ratio', value: portfolioData.sharpeRatio, color: '#10b981' },
                      { label: 'Volatilité', value: portfolioData.volatility + '%', color: '#f59e0b' },
                      { label: 'Max Drawdown', value: portfolioData.maxDrawdown + '%', color: '#f43f5e' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    📈 Métriques
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Alpha', value: portfolioMetrics.alpha + '%', color: '#3b82f6' },
                      { label: 'Beta', value: portfolioMetrics.beta, color: '#8b5cf6' },
                      { label: 'Sortino', value: portfolioMetrics.sortinoRatio, color: '#a78bfa' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: '0 0 16px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    💰 Synthèse
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { label: 'Capital Investi', value: '€' + (portfolioData.totalInvested / 1000).toFixed(0) + 'k', color: '#3b82f6' },
                      { label: 'Gain Non-Réalisé', value: '+€' + (portfolioData.unrealizedGain / 1000).toFixed(1) + 'k', color: '#10b981' },
                      { label: 'Var. Semaine', value: '+€' + (portfolioData.weekChange / 1000).toFixed(1) + 'k', color: '#a78bfa' },
                    ].map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: idx < 2 ? '12px' : 0,
                        borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: '600',
                        }}>
                          {m.label}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          color: m.color,
                        }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: 'white',
              margin: '0 0 24px 0',
            }}>
              💹 Marché
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {marketData.map((item, idx) => (
                <div key={idx} className="metric-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'white',
                    margin: '0 0 12px 0',
                  }}>
                    {item.name}
                  </p>
                  <p style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: '#60a5fa',
                    margin: '0 0 8px 0',
                  }}>
                    {item.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: item.change > 0 ? '#10b981' : '#f43f5e',
                    margin: 0,
                  }}>
                    {item.change > 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                  </p>
                </div>
              ))}
            </div>
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
                    <span style={{ color: '#f59e0b' }}>
                      🔥 Racha: {progress.streak}
                    </span>
                  )}
                  {progress.badges && progress.badges.length > 0 && (
                    <span style={{ color: '#a78bfa' }}>
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
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
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
                          background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
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
                          <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Maîtrisé</span>
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
                          border: `2px solid ${domain.color}40`,
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
                          e.currentTarget.style.borderColor = `${domain.color}40`;
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

        {/* FRIENDS TAB */}
        {activeTab === 'friends' && (
          <div style={{ marginTop: '20px' }}>
            {/* Friends Header */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '800',
                color: currentTheme.text,
                margin: '0 0 24px 0',
              }}>
                👥 Mes Amis
              </h2>

              {/* Friends Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: `1px solid ${currentTheme.border}`,
                paddingBottom: '12px',
              }}>
                {[
                  { id: 'friends', label: `Amis (${userData.friends.length})` },
                  { id: 'leaderboard', label: '🏆 Classement' },
                  { id: 'messages', label: '💬 Messages' },
                  { id: 'guildes', label: '👥 Guildes' },
                  { id: 'search', label: '🔍 Chercher' },
                  { id: 'pending', label: `📩 Demandes (${userData.friendRequests.received.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFriendsTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      background: friendsTab === tab.id ? 'transparent' : 'transparent',
                      border: 'none',
                      borderBottom: friendsTab === tab.id ? `2px solid ${currentTheme.accent}` : 'none',
                      color: friendsTab === tab.id ? currentTheme.accent : currentTheme.textSecondary,
                      fontWeight: friendsTab === tab.id ? '700' : '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Friend Code Card */}
              <div style={{
                display: 'flex',
                gap: '16px',
                padding: '20px',
                background: currentTheme.cardBg,
                borderRadius: '16px',
                border: `1px solid ${currentTheme.border}`,
                marginBottom: '24px',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: currentTheme.textSecondary,
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Ton Code Ami Unique
                  </p>
                  <p style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    color: currentTheme.accent,
                    margin: 0,
                    fontFamily: 'monospace',
                  }}>
                    {userData.friendCode}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(userData.friendCode)}
                  style={{
                    padding: '12px 20px',
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : currentTheme.accent,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '12px',
                    color: copied ? '#10b981' : '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.target.style.background = currentTheme.accent;
                  }}
                >
                  {copied ? '✓ Copié!' : 'Copier Code'}
                </button>
              </div>
            </div>

            {/* Leaderboard Section */}
            {friendsTab === 'leaderboard' && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 20px 0',
                }}>
                  🏆 Classement de tes Amis
                </h3>

                {userData.friends.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: currentTheme.cardBg,
                    borderRadius: '16px',
                    border: `1px solid ${currentTheme.border}`,
                  }}>
                    <p style={{
                      fontSize: '16px',
                      color: currentTheme.textSecondary,
                      margin: 0,
                    }}>
                      Ajoute des amis pour voir le classement !
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {/* Classement par XP */}
                    <div>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        margin: '0 0 12px 0',
                      }}>
                        Par XP
                      </p>
                      {[...userData.friends]
                        .sort((a, b) => {
                          const aXP = availableUsers.find(u => u.friendCode === a.friendCode)?.xp || 0;
                          const bXP = availableUsers.find(u => u.friendCode === b.friendCode)?.xp || 0;
                          return bXP - aXP;
                        })
                        .map((friend, idx) => {
                          const friendData = availableUsers.find(u => u.friendCode === friend.friendCode);
                          const myXP = progress.totalXP || 0;
                          const isHigher = (friendData?.xp || 0) > myXP;

                          return (
                            <div
                              key={friend.userId}
                              onClick={() => setSelectedFriendProfile(friendData)}
                              style={{
                                padding: '14px',
                                background: currentTheme.cardBg,
                                borderRadius: '12px',
                                border: `1px solid ${currentTheme.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                e.currentTarget.style.borderColor = currentTheme.accent;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = currentTheme.cardBg;
                                e.currentTarget.style.borderColor = currentTheme.border;
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                  fontWeight: '700',
                                  color: '#fff',
                                }}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{
                                    color: currentTheme.text,
                                    fontWeight: '600',
                                    margin: '0 0 2px 0',
                                    fontSize: '14px',
                                  }}>
                                    {friendData?.name}
                                  </p>
                                  <p style={{
                                    color: currentTheme.textSecondary,
                                    fontSize: '11px',
                                    margin: 0,
                                  }}>
                                    Niveau {friendData?.level}
                                  </p>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: isHigher ? '#f59e0b' : '#10b981',
                                  margin: '0 0 4px 0',
                                }}>
                                  {friendData?.xp} XP
                                </p>
                                <p style={{
                                  fontSize: '11px',
                                  color: isHigher ? '#f59e0b' : '#10b981',
                                  margin: 0,
                                }}>
                                  {isHigher ? '↑ Plus que toi' : '↓ Tu le dépasses'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages Section */}
            {friendsTab === 'messages' && (
              <div style={{ marginBottom: '32px' }}>
                {!selectedChatFriend ? (
                  <>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: currentTheme.text,
                      margin: '0 0 20px 0',
                    }}>
                      💬 Messages
                    </h3>
                    {userData.friends.length === 0 ? (
                      <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        background: currentTheme.cardBg,
                        borderRadius: '16px',
                        border: `1px solid ${currentTheme.border}`,
                      }}>
                        <p style={{
                          fontSize: '16px',
                          color: currentTheme.textSecondary,
                          margin: 0,
                        }}>
                          Ajoute des amis pour commencer à discuter !
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {userData.friends.map((friend) => {
                          const friendData = availableUsers.find(u => u.friendCode === friend.friendCode);
                          const unreadCount = Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0;
                          return (
                            <div
                              key={friend.userId}
                              onClick={() => setSelectedChatFriend(friend)}
                              style={{
                                padding: '14px',
                                background: currentTheme.cardBg,
                                borderRadius: '12px',
                                border: `1px solid ${currentTheme.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                e.currentTarget.style.borderColor = currentTheme.accent;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = currentTheme.cardBg;
                                e.currentTarget.style.borderColor = currentTheme.border;
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                }}>
                                  {friendData?.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{
                                    color: currentTheme.text,
                                    fontWeight: '600',
                                    margin: '0 0 2px 0',
                                    fontSize: '14px',
                                  }}>
                                    {friendData?.name}
                                  </p>
                                  <p style={{
                                    color: currentTheme.textSecondary,
                                    fontSize: '11px',
                                    margin: 0,
                                  }}>
                                    Clique pour discuter
                                  </p>
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <div style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                }}>
                                  {unreadCount}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Chat Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px',
                      paddingBottom: '16px',
                      borderBottom: `1px solid ${currentTheme.border}`,
                    }}>
                      <button
                        onClick={() => setSelectedChatFriend(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: currentTheme.text,
                          fontSize: '20px',
                          cursor: 'pointer',
                        }}
                      >
                        ←
                      </button>
                      <div>
                        <p style={{
                          color: currentTheme.text,
                          fontWeight: '600',
                          margin: '0 0 2px 0',
                        }}>
                          {availableUsers.find(u => u.friendCode === selectedChatFriend.friendCode)?.name}
                        </p>
                        <p style={{
                          color: currentTheme.textSecondary,
                          fontSize: '11px',
                          margin: 0,
                        }}>
                          🟢 En ligne
                        </p>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      padding: '16px',
                      height: '300px',
                      overflowY: 'auto',
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      <div style={{
                        alignSelf: 'flex-start',
                        maxWidth: '70%',
                        padding: '10px 14px',
                        background: currentTheme.cardBg,
                        borderRadius: '12px',
                        border: `1px solid ${currentTheme.border}`,
                      }}>
                        <p style={{ color: currentTheme.text, margin: 0, fontSize: '13px' }}>
                          Salut ! Comment ça va ?
                        </p>
                      </div>
                      <div style={{
                        alignSelf: 'flex-end',
                        maxWidth: '70%',
                        padding: '10px 14px',
                        background: currentTheme.accent,
                        borderRadius: '12px',
                        color: '#fff',
                      }}>
                        <p style={{ color: '#fff', margin: 0, fontSize: '13px' }}>
                          Bien ! On travaille sur InvestKit 🚀
                        </p>
                      </div>
                    </div>

                    {/* Chat Input */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                    }}>
                      <input
                        type="text"
                        placeholder="Écris un message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: currentTheme.cardBg,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '10px',
                          color: currentTheme.text,
                          fontSize: '13px',
                          outline: 'none',
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && messageInput.trim()) {
                            setMessageInput('');
                          }
                        }}
                      />
                      <button
                        onClick={() => setMessageInput('')}
                        style={{
                          padding: '10px 16px',
                          background: currentTheme.accent,
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = currentTheme.accent;
                        }}
                      >
                        Envoyer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Guildes Section */}
            {friendsTab === 'guildes' && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: 0,
                  }}>
                    👥 Guildes & Groupes
                  </h3>
                  {progress.userLevel >= 7 ? (
                    <button
                      onClick={() => setShowCreateGuilde(!showCreateGuilde)}
                      style={{
                        padding: '8px 16px',
                        background: currentTheme.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {showCreateGuilde ? '✕' : '➕'} Créer
                    </button>
                  ) : (
                    <div style={{
                      padding: '8px 16px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '8px',
                      color: '#fca5a5',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'not-allowed',
                    }}>
                      🔒 Niveau 7+ requis
                    </div>
                  )}
                </div>

                {showCreateGuilde && progress.userLevel >= 7 && (
                  <div style={{
                    padding: '16px',
                    background: currentTheme.cardBg,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.border}`,
                    marginBottom: '20px',
                  }}>
                    {/* Name & Description */}
                    <input
                      type="text"
                      placeholder="Nom de la guilde (ex: Crypto Traders)"
                      value={newGuildeName}
                      onChange={(e) => setNewGuildeName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        color: currentTheme.text,
                        marginBottom: '10px',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <textarea
                      placeholder="Description de la guilde..."
                      value={newGuildeDesc}
                      onChange={(e) => setNewGuildeDesc(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        color: currentTheme.text,
                        marginBottom: '12px',
                        fontSize: '13px',
                        outline: 'none',
                        minHeight: '60px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />

                    {/* Restrictions */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      border: `1px solid rgba(59, 130, 246, 0.3)`,
                      marginBottom: '12px',
                    }}>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: currentTheme.text,
                        margin: '0 0 10px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        🔒 Restrictions (Optionnel)
                      </p>

                      {/* Min Level */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{
                          fontSize: '12px',
                          color: currentTheme.textSecondary,
                          display: 'block',
                          marginBottom: '4px',
                        }}>
                          Niveau minimum requis
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={guildeRestrictions.minLevel}
                          onChange={(e) => setGuildeRestrictions({
                            ...guildeRestrictions,
                            minLevel: parseInt(e.target.value) || 1
                          })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '6px',
                            color: currentTheme.text,
                            fontSize: '12px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Domain Requirements */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{
                          fontSize: '12px',
                          color: currentTheme.textSecondary,
                          display: 'block',
                          marginBottom: '6px',
                        }}>
                          Progression domaine minimum (optionnel)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {['crypto', 'stocks', 'realestate', 'bonds'].map((domain) => (
                            <div key={domain}>
                              <label style={{
                                fontSize: '11px',
                                color: currentTheme.textSecondary,
                                display: 'block',
                                marginBottom: '3px',
                                textTransform: 'capitalize',
                              }}>
                                {domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0%"
                                value={guildeRestrictions.domainRequirements[domain] || 0}
                                onChange={(e) => setGuildeRestrictions({
                                  ...guildeRestrictions,
                                  domainRequirements: {
                                    ...guildeRestrictions.domainRequirements,
                                    [domain]: parseInt(e.target.value) || 0
                                  }
                                })}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  border: `1px solid ${currentTheme.border}`,
                                  borderRadius: '4px',
                                  color: currentTheme.text,
                                  fontSize: '11px',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (newGuildeName.trim() && progress.userLevel >= 7) {
                          setGuildes([...guildes, {
                            id: guildes.length + 1,
                            name: newGuildeName,
                            members: 1,
                            description: newGuildeDesc,
                            emoji: '✨',
                            restrictions: guildeRestrictions
                          }]);
                          setNewGuildeName('');
                          setNewGuildeDesc('');
                          setGuildeRestrictions({
                            minLevel: 1,
                            minXP: 0,
                            requiredBadges: [],
                            domainRequirements: {},
                          });
                          setShowCreateGuilde(false);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: currentTheme.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Créer la Guilde
                    </button>
                  </div>
                )}

                <div style={{ display: 'grid', gap: '12px' }}>
                  {guildes.map((guilde) => (
                    <div
                      key={guilde.id}
                      style={{
                        padding: '16px',
                        background: currentTheme.cardBg,
                        borderRadius: '12px',
                        border: `1px solid ${currentTheme.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => setSelectedGuilde(guilde)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = currentTheme.cardBg;
                        e.currentTarget.style.borderColor = currentTheme.border;
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '8px',
                      }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                          }}>
                            {guilde.emoji}
                          </div>
                          <div>
                            <p style={{
                              color: currentTheme.text,
                              fontWeight: '700',
                              margin: '0 0 2px 0',
                              fontSize: '14px',
                            }}>
                              {guilde.name}
                            </p>
                            <p style={{
                              color: currentTheme.textSecondary,
                              fontSize: '11px',
                              margin: 0,
                            }}>
                              👥 {guilde.members} membre{guilde.members > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          style={{
                            padding: '6px 12px',
                            background: currentTheme.accent,
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Rejoindre
                        </button>
                      </div>
                      <p style={{
                        color: currentTheme.textSecondary,
                        fontSize: '12px',
                        margin: '0 0 10px 0',
                      }}>
                        {guilde.description}
                      </p>

                      {/* Requirements */}
                      {guilde.restrictions && (
                        <div style={{
                          padding: '10px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '6px',
                          border: `1px solid rgba(59, 130, 246, 0.2)`,
                          marginBottom: '10px',
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: currentTheme.textSecondary,
                            margin: '0 0 6px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            🔒 Conditions d'accès
                          </p>
                          <div style={{ fontSize: '11px', color: currentTheme.textSecondary, lineHeight: '1.4' }}>
                            {guilde.restrictions.minLevel > 1 && (
                              <div style={{ marginBottom: '3px' }}>
                                📊 Niveau: {guilde.restrictions.minLevel}+ {progress.userLevel >= guilde.restrictions.minLevel ? '✓' : '✗'}
                              </div>
                            )}
                            {Object.entries(guilde.restrictions.domainRequirements || {}).map(([domain, requirement]) => {
                              if (requirement > 0) {
                                const domainLabel = domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto';
                                const userProgress = progress.domainsProgress?.[domain] || 0;
                                return (
                                  <div key={domain} style={{ marginBottom: '2px' }}>
                                    📈 {domainLabel}: {requirement}% {userProgress >= requirement ? '✓' : '✗'}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      {guilde.restrictions && (
                        <div style={{ marginTop: '8px', fontSize: '11px' }}>
                          {(() => {
                            const levelOk = !guilde.restrictions.minLevel || progress.userLevel >= guilde.restrictions.minLevel;
                            const domainsOk = Object.entries(guilde.restrictions.domainRequirements || {}).every(([domain, requirement]) => {
                              if (requirement === 0) return true;
                              const userProgress = progress.domainsProgress?.[domain] || 0;
                              return userProgress >= requirement;
                            });
                            const canJoin = levelOk && domainsOk;
                            return canJoin ? (
                              <span style={{ color: '#4ade80', fontWeight: '600' }}>✓ Conditions remplies</span>
                            ) : (
                              <span style={{ color: '#f87171', fontWeight: '600' }}>✗ Conditions non remplies</span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Section */}
            {friendsTab === 'search' && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <input
                    type="text"
                    placeholder="Cherche par #ID ou nom (ex: #ABC123 ou Alice)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: currentTheme.cardBg,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '12px',
                      color: currentTheme.text,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = currentTheme.accent;
                      e.target.style.boxShadow = `0 0 0 3px ${currentTheme.accent}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentTheme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {searchQuery.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: currentTheme.cardBg,
                    borderRadius: '16px',
                    border: `1px solid ${currentTheme.border}`,
                  }}>
                    <p style={{
                      fontSize: '16px',
                      color: currentTheme.textSecondary,
                      margin: 0,
                    }}>
                      Rentre un #ID ou un nom pour chercher des utilisateurs
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: currentTheme.cardBg,
                    borderRadius: '16px',
                    border: `1px solid ${currentTheme.border}`,
                  }}>
                    <p style={{
                      fontSize: '16px',
                      color: currentTheme.textSecondary,
                      margin: 0,
                    }}>
                      Aucun utilisateur trouvé
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {searchResults.map((user) => {
                      const isFriend = userData.friends.some((f) => f.friendCode === user.friendCode);
                      const hasSentRequest = userData.friendRequests.sent.some(
                        (req) => req.friendCode === user.friendCode
                      );

                      return (
                        <div
                          key={user.friendCode}
                          style={{
                            padding: '16px',
                            background: currentTheme.cardBg,
                            borderRadius: '12px',
                            border: `1px solid ${currentTheme.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px',
                            }}>
                              {user.avatar}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                color: currentTheme.text,
                                fontWeight: '600',
                                margin: '0 0 4px 0',
                                fontSize: '15px',
                              }}>
                                {user.name}
                              </p>
                              <p style={{
                                color: currentTheme.textSecondary,
                                fontSize: '12px',
                                margin: 0,
                                fontFamily: 'monospace',
                              }}>
                                {user.friendCode} • Niveau {user.level}
                              </p>
                            </div>
                          </div>
                          {isFriend ? (
                            <span style={{
                              color: '#10b981',
                              fontWeight: '600',
                              fontSize: '13px',
                            }}>
                              ✓ Ami
                            </span>
                          ) : hasSentRequest ? (
                            <span style={{
                              color: currentTheme.accent,
                              fontWeight: '600',
                              fontSize: '13px',
                            }}>
                              ⏳ Demande envoyée
                            </span>
                          ) : (
                            <button
                              onClick={() => sendFriendRequest(user.friendCode, user.name)}
                              style={{
                                padding: '8px 16px',
                                background: currentTheme.accent,
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = currentTheme.accent;
                              }}
                            >
                              ➕ Ajouter
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Friends Stats and List - Show only when on friends tab */}
            {friendsTab === 'friends' && (
            <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {[
                { label: 'Amis', value: userData.friends.length, icon: '👫', color: '#3b82f6' },
                { label: 'Demandes reçues', value: userData.friendRequests.received.length, icon: '📬', color: '#f59e0b' },
                { label: 'Demandes envoyées', value: userData.friendRequests.sent.length, icon: '📤', color: '#8b5cf6' },
                { label: 'Bloqués', value: userData.blockedUsers.length, icon: '🚫', color: '#ef4444' },
              ].map((stat, idx) => (
                <div key={idx} style={{
                  padding: '20px',
                  background: currentTheme.cardBg,
                  borderRadius: '16px',
                  border: `1px solid ${currentTheme.border}`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: '28px',
                    margin: '0 0 8px 0',
                  }}>
                    {stat.icon}
                  </p>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    color: stat.color,
                    margin: '0 0 4px 0',
                  }}>
                    {stat.value}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                  }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Friends List */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: currentTheme.text,
                margin: '0 0 16px 0',
              }}>
                {userData.friends.length > 0 ? 'Mes Amis' : 'Aucun ami pour le moment'}
              </h3>

              {userData.friends.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: currentTheme.cardBg,
                  borderRadius: '16px',
                  border: `1px solid ${currentTheme.border}`,
                }}>
                  <p style={{
                    fontSize: '16px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                  }}>
                    Partage ton code ami #{userData.friendCode} pour commencer ! 👉
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '12px',
                }}>
                  {userData.friends.map((friend, idx) => (
                    <div key={friend.userId} style={{
                      padding: '16px',
                      background: currentTheme.cardBg,
                      borderRadius: '12px',
                      border: `1px solid ${currentTheme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '16px',
                        }}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p style={{
                            color: currentTheme.text,
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                          }}>
                            {friend.name}
                          </p>
                          <p style={{
                            color: currentTheme.textSecondary,
                            fontSize: '12px',
                            margin: 0,
                            fontFamily: 'monospace',
                          }}>
                            {friend.friendCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}

            {/* Pending Requests */}
            {friendsTab === 'pending' && (
            <>
            {(userData.friendRequests.received.length > 0 || userData.friendRequests.sent.length > 0) && (
              <div style={{ marginTop: '32px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 16px 0',
                }}>
                  📩 Demandes d'Ami
                </h3>

                {userData.friendRequests.received.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: currentTheme.textSecondary,
                      margin: '0 0 12px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      À Accepter ({userData.friendRequests.received.length})
                    </p>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {userData.friendRequests.received.map((req) => (
                        <div key={req.userId} style={{
                          padding: '12px',
                          background: currentTheme.cardBg,
                          borderRadius: '10px',
                          border: `1px solid ${currentTheme.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <p style={{ color: currentTheme.text, margin: '0 0 2px 0', fontWeight: '600' }}>
                              {req.name}
                            </p>
                            <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>
                              {req.friendCode}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => acceptFriendRequest(req.friendCode, req.name)}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(req.friendCode)}
                              style={{
                                padding: '6px 12px',
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
            )}
            {userData.friendRequests.received.length === 0 && userData.friendRequests.sent.length === 0 && friendsTab === 'pending' && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                background: currentTheme.cardBg,
                borderRadius: '16px',
                border: `1px solid ${currentTheme.border}`,
              }}>
                <p style={{
                  fontSize: '16px',
                  color: currentTheme.textSecondary,
                  margin: 0,
                }}>
                  Aucune demande pour le moment
                </p>
              </div>
            )}
          </div>
        )}

        {/* Friend Profile Modal */}
        {selectedFriendProfile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{
              background: currentTheme.cardBg,
              borderRadius: '20px',
              border: `1px solid ${currentTheme.border}`,
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setSelectedFriendProfile(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: currentTheme.text,
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>

              {/* Profile Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  margin: '0 auto 16px',
                }}>
                  {selectedFriendProfile.avatar}
                </div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: currentTheme.text,
                  margin: '0 0 4px 0',
                }}>
                  {selectedFriendProfile.name}
                </h2>
                <p style={{
                  fontSize: '12px',
                  color: currentTheme.textSecondary,
                  margin: '0 0 12px 0',
                  fontFamily: 'monospace',
                }}>
                  {selectedFriendProfile.friendCode}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: currentTheme.textSecondary,
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  {selectedFriendProfile.bio}
                </p>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.border}`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: currentTheme.accent,
                    margin: '0 0 4px 0',
                  }}>
                    {selectedFriendProfile.level}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                    Niveau
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.border}`,
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: '#8b5cf6',
                    margin: '0 0 4px 0',
                  }}>
                    {selectedFriendProfile.xp}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: currentTheme.textSecondary,
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                    XP Total
                  </p>
                </div>
              </div>

              {/* Domains Progress */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: currentTheme.text,
                  margin: '0 0 12px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  📚 Progression Académie
                </h3>
                {Object.entries(selectedFriendProfile.domainsProgress).map(([domain, progress]) => (
                  <div key={domain} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.text,
                        margin: 0,
                        textTransform: 'capitalize',
                      }}>
                        {domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto'}
                      </p>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: currentTheme.accent,
                        margin: 0,
                      }}>
                        {progress}%
                      </p>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {selectedFriendProfile.badges.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: currentTheme.text,
                    margin: '0 0 12px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    🏅 Badges
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                    gap: '8px',
                  }}>
                    {selectedFriendProfile.badges.map((badge, idx) => {
                      const badgeEmojis = {
                        first_blood: '🩸',
                        perfect: '💯',
                        no_mistakes: '🎯',
                        crypto_master: '₿',
                        stocks_master: '📈',
                      };
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '8px',
                            border: `1px solid rgba(245, 158, 11, 0.3)`,
                            textAlign: 'center',
                            fontSize: '24px',
                          }}
                          title={badge}
                        >
                          {badgeEmojis[badge] || '⭐'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
                <button
                  style={{
                    padding: '12px 16px',
                    background: currentTheme.accent,
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = currentTheme.accent;
                  }}
                >
                  💬 Message
                </button>
                <button
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: `1px solid ${currentTheme.accent}`,
                    borderRadius: '10px',
                    color: currentTheme.accent,
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                  }}
                >
                  🎯 Défi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GUILD DETAILS MODAL */}
        {selectedGuilde && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{
              background: currentTheme.cardBg,
              borderRadius: '20px',
              border: `1px solid ${currentTheme.border}`,
              padding: '32px',
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setSelectedGuilde(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: currentTheme.text,
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>

              {/* Guild Header */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  margin: '0 auto 16px',
                }}>
                  {selectedGuilde.emoji}
                </div>
                <h2 style={{
                  fontSize: '26px',
                  fontWeight: '800',
                  color: currentTheme.text,
                  margin: '0 0 8px 0',
                }}>
                  {selectedGuilde.name}
                </h2>
                <p style={{
                  fontSize: '13px',
                  color: currentTheme.textSecondary,
                  margin: 0,
                }}>
                  👥 {selectedGuilde.members} membre{selectedGuilde.members > 1 ? 's' : ''}
                </p>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: `1px solid ${currentTheme.border}`,
              }}>
                {['info', 'members', 'chat'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedGuildeTab(tab)}
                    style={{
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: selectedGuildeTab === tab ? currentTheme.accent : currentTheme.textSecondary,
                      fontWeight: selectedGuildeTab === tab ? '700' : '500',
                      cursor: 'pointer',
                      borderBottom: selectedGuildeTab === tab ? `2px solid ${currentTheme.accent}` : 'none',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab === 'info' && 'ℹ️ Info'}
                    {tab === 'members' && '👥 Membres'}
                    {tab === 'chat' && '💬 Chat'}
                  </button>
                ))}
              </div>

              {/* TAB: Info */}
              {selectedGuildeTab === 'info' && (
                <>
              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: currentTheme.textSecondary,
                  margin: '0 0 8px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  À propos
                </p>
                <p style={{
                  fontSize: '14px',
                  color: currentTheme.text,
                  margin: 0,
                  lineHeight: '1.6',
                }}>
                  {selectedGuilde.description}
                </p>
              </div>

              {/* Access Conditions */}
              {selectedGuilde.restrictions && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '10px',
                  border: `1px solid rgba(59, 130, 246, 0.3)`,
                  marginBottom: '24px',
                }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: currentTheme.textSecondary,
                    margin: '0 0 10px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    🔒 Conditions d'accès
                  </p>
                  <div style={{ fontSize: '12px', color: currentTheme.text, lineHeight: '1.6' }}>
                    {selectedGuilde.restrictions.minLevel > 1 && (
                      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📊 Niveau minimum</span>
                        <span style={{ fontWeight: '600' }}>{selectedGuilde.restrictions.minLevel} {progress.userLevel >= selectedGuilde.restrictions.minLevel ? '✓' : '✗'}</span>
                      </div>
                    )}
                    {Object.entries(selectedGuilde.restrictions.domainRequirements || {}).map(([domain, requirement]) => {
                      if (requirement > 0) {
                        const domainLabel = domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto';
                        const userProgress = progress.domainsProgress?.[domain] || 0;
                        return (
                          <div key={domain} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>📈 {domainLabel}</span>
                            <span style={{ fontWeight: '600' }}>{requirement}% {userProgress >= requirement ? '✓' : '✗'}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Guild Level & XP */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: currentTheme.textSecondary,
                  margin: '0 0 10px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  ⬆️ Progression de Guilde
                </p>
                <div style={{
                  padding: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: `1px solid rgba(59, 130, 246, 0.3)`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: currentTheme.text, fontWeight: '600' }}>Niveau {selectedGuilde.level}</span>
                    <span style={{ color: currentTheme.textSecondary, fontSize: '12px' }}>{selectedGuilde.totalXP} XP</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(selectedGuilde.level / 20) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${currentTheme.accent}, #8b5cf6)`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <p style={{
                    fontSize: '11px',
                    color: currentTheme.textSecondary,
                    margin: '8px 0 0 0',
                  }}>
                    Niveau max: 20
                  </p>
                </div>
              </div>
              </>
              )}

              {/* TAB: Members List */}
              {selectedGuildeTab === 'members' && (
                <div style={{ marginBottom: '24px' }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: currentTheme.textSecondary,
                    margin: '0 0 10px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    👥 Membres ({selectedGuilde.membersList?.length || 0})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedGuilde.membersList?.map((member) => {
                      const userCanManage = isUserGuildLeader(selectedGuilde) && member.name !== 'SMC.SRB';
                      const isShowingActions = memberActionMenu?.guildId === selectedGuilde.id && memberActionMenu?.memberId === member.id;

                      return (
                        <div key={member.id} style={{ position: 'relative' }}>
                          <div
                            style={{
                              padding: '10px',
                              background: 'rgba(59, 130, 246, 0.05)',
                              borderRadius: '8px',
                              border: `1px solid ${currentTheme.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <p style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: currentTheme.text,
                                margin: 0,
                              }}>
                                {member.name}
                              </p>
                              <p style={{
                                fontSize: '11px',
                                color: currentTheme.textSecondary,
                                margin: '2px 0 0 0',
                              }}>
                                Niveau {member.level} • Rejoint: {member.joinedDate}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                color: member.role === 'Leader' ? '#fbbf24' : member.role === 'Co-leader' ? '#60a5fa' : member.role === 'Elder' ? '#818cf8' : currentTheme.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                padding: '4px 8px',
                                background: member.role === 'Leader' ? 'rgba(251, 191, 36, 0.1)' : member.role === 'Co-leader' ? 'rgba(96, 165, 250, 0.1)' : member.role === 'Elder' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                              }}>
                                {member.role}
                              </span>
                              {userCanManage && (
                                <button
                                  onClick={() => setMemberActionMenu(isShowingActions ? null : { guildId: selectedGuilde.id, memberId: member.id })}
                                  style={{
                                    padding: '4px 8px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: currentTheme.accent,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                  }}
                                >
                                  ⋮
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Action Menu */}
                          {isShowingActions && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: currentTheme.cardBg,
                                border: `1px solid ${currentTheme.border}`,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                zIndex: 100,
                                minWidth: '200px',
                              }}
                            >
                              {/* Change Role */}
                              <button
                                onClick={() => setRoleChangeMenu(
                                  roleChangeMenu?.guildId === selectedGuilde.id && roleChangeMenu?.memberId === member.id
                                    ? null
                                    : { guildId: selectedGuilde.id, memberId: member.id }
                                )}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: `1px solid ${currentTheme.border}`,
                                  color: currentTheme.text,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                👤 Changer le rôle
                              </button>

                              {/* Promote */}
                              <button
                                onClick={() => {
                                  const roles = ['Member', 'Elder', 'Co-leader', 'Leader'];
                                  const currentIdx = roles.indexOf(member.role);
                                  if (currentIdx < roles.length - 1) {
                                    handleChangeRole(selectedGuilde.id, member.id, roles[currentIdx + 1]);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: `1px solid ${currentTheme.border}`,
                                  color: '#86efac',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                ⬆️ Promouvoir
                              </button>

                              {/* Demote */}
                              <button
                                onClick={() => {
                                  const roles = ['Member', 'Elder', 'Co-leader', 'Leader'];
                                  const currentIdx = roles.indexOf(member.role);
                                  if (currentIdx > 0) {
                                    handleChangeRole(selectedGuilde.id, member.id, roles[currentIdx - 1]);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: `1px solid ${currentTheme.border}`,
                                  color: '#fca5a5',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                ⬇️ Rétrograder
                              </button>

                              {/* Kick */}
                              <button
                                onClick={() => handleKickMember(selectedGuilde.id, member.id)}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                🚫 Expulser
                              </button>
                            </div>
                          )}

                          {/* Role Change Menu */}
                          {roleChangeMenu?.guildId === selectedGuilde.id && roleChangeMenu?.memberId === member.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: '50px',
                                marginTop: '4px',
                                background: currentTheme.cardBg,
                                border: `1px solid ${currentTheme.border}`,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                zIndex: 101,
                                minWidth: '150px',
                              }}
                            >
                              {['Member', 'Elder', 'Co-leader', 'Leader'].map((role) => (
                                <button
                                  key={role}
                                  onClick={() => handleChangeRole(selectedGuilde.id, member.id, role)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: member.role === role ? 'rgba(59, 130, 246, 0.2)' : 'none',
                                    border: 'none',
                                    borderBottom: role !== 'Leader' ? `1px solid ${currentTheme.border}` : 'none',
                                    color: member.role === role ? currentTheme.accent : currentTheme.text,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: member.role === role ? '600' : '400',
                                  }}
                                >
                                  {member.role === role && '✓ '}{role}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: Chat */}
              {selectedGuildeTab === 'chat' && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    marginBottom: '12px',
                  }}>
                    {selectedGuilde.chat?.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          padding: '8px 10px',
                          background: 'rgba(59, 130, 246, 0.05)',
                          borderRadius: '8px',
                          border: `1px solid ${currentTheme.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: currentTheme.text }}>
                            {msg.author}
                          </span>
                          <span style={{ fontSize: '10px', color: currentTheme.textSecondary }}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '12px',
                          color: currentTheme.text,
                          margin: 0,
                          wordBreak: 'break-word',
                        }}>
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>

                  {userGuildes.includes(selectedGuilde.id) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Envoyer un message..."
                        value={guildChatInput}
                        onChange={(e) => setGuildChatInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && guildChatInput.trim()) {
                            const newMessage = {
                              id: selectedGuilde.chat.length + 1,
                              author: 'SMC.SRB',
                              message: guildChatInput,
                              timestamp: new Date().toLocaleString(),
                            };
                            setGuildes(guildes.map(g =>
                              g.id === selectedGuilde.id
                                ? { ...g, chat: [...g.chat, newMessage] }
                                : g
                            ));
                            setGuildChatInput('');
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '6px',
                          color: currentTheme.text,
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => {
                          if (guildChatInput.trim()) {
                            const newMessage = {
                              id: selectedGuilde.chat.length + 1,
                              author: 'SMC.SRB',
                              message: guildChatInput,
                              timestamp: new Date().toLocaleString(),
                            };
                            setGuildes(guildes.map(g =>
                              g.id === selectedGuilde.id
                                ? { ...g, chat: [...g.chat, newMessage] }
                                : g
                            ));
                            setGuildChatInput('');
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          background: currentTheme.accent,
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        📤 Envoyer
                      </button>
                    </div>
                  )}

                  {!userGuildes.includes(selectedGuilde.id) && (
                    <p style={{
                      fontSize: '12px',
                      color: currentTheme.textSecondary,
                      textAlign: 'center',
                      padding: '12px',
                    }}>
                      Rejoins la guilde pour participer au chat
                    </p>
                  )}
                </div>
              )}


              {/* Eligibility Check */}
              <div style={{
                padding: '12px',
                background: (() => {
                  const levelOk = !selectedGuilde.restrictions.minLevel || progress.userLevel >= selectedGuilde.restrictions.minLevel;
                  const domainsOk = Object.entries(selectedGuilde.restrictions.domainRequirements || {}).every(([domain, requirement]) => {
                    if (requirement === 0) return true;
                    const userProgress = progress.domainsProgress?.[domain] || 0;
                    return userProgress >= requirement;
                  });
                  return levelOk && domainsOk ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                })(),
                borderRadius: '10px',
                border: (() => {
                  const levelOk = !selectedGuilde.restrictions.minLevel || progress.userLevel >= selectedGuilde.restrictions.minLevel;
                  const domainsOk = Object.entries(selectedGuilde.restrictions.domainRequirements || {}).every(([domain, requirement]) => {
                    if (requirement === 0) return true;
                    const userProgress = progress.domainsProgress?.[domain] || 0;
                    return userProgress >= requirement;
                  });
                  return levelOk && domainsOk ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)';
                })(),
                marginBottom: '20px',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
              }}>
                {(() => {
                  const levelOk = !selectedGuilde.restrictions.minLevel || progress.userLevel >= selectedGuilde.restrictions.minLevel;
                  const domainsOk = Object.entries(selectedGuilde.restrictions.domainRequirements || {}).every(([domain, requirement]) => {
                    if (requirement === 0) return true;
                    const userProgress = progress.domainsProgress?.[domain] || 0;
                    return userProgress >= requirement;
                  });
                  const canJoin = levelOk && domainsOk;
                  return canJoin ? (
                    <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '13px' }}>✓ Tu peux rejoindre cette guilde!</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>✗ Tu ne remplis pas les conditions</span>
                  );
                })()}
              </div>

              {/* Guild Message Display */}
              {guildMessage && (
                <div style={{
                  padding: '12px',
                  background: guildMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderRadius: '10px',
                  border: guildMessage.type === 'success' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: guildMessage.type === 'success' ? '#86efac' : '#fca5a5',
                }}>
                  {guildMessage.text}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
                {(() => {
                  const levelOk = !selectedGuilde.restrictions.minLevel || progress.userLevel >= selectedGuilde.restrictions.minLevel;
                  const domainsOk = Object.entries(selectedGuilde.restrictions.domainRequirements || {}).every(([domain, requirement]) => {
                    if (requirement === 0) return true;
                    const userProgress = progress.domainsProgress?.[domain] || 0;
                    return userProgress >= requirement;
                  });
                  const canJoin = levelOk && domainsOk;
                  const alreadyMember = userGuildes.includes(selectedGuilde.id);

                  return (
                    <button
                      onClick={() => {
                        if (!alreadyMember) {
                          handleJoinGuilde(selectedGuilde);
                        }
                      }}
                      style={{
                        padding: '12px 16px',
                        background: alreadyMember ? 'rgba(34, 197, 94, 0.3)' : canJoin ? currentTheme.accent : 'rgba(107, 114, 128, 0.5)',
                        border: alreadyMember ? '1px solid rgba(34, 197, 94, 0.5)' : 'none',
                        borderRadius: '10px',
                        color: alreadyMember ? '#86efac' : '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: canJoin && !alreadyMember ? 1 : 0.6,
                      }}
                      onMouseEnter={(e) => {
                        if (canJoin && !alreadyMember) {
                          e.target.style.background = 'rgba(59, 130, 246, 0.8)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canJoin && !alreadyMember) {
                          e.target.style.background = currentTheme.accent;
                        } else if (alreadyMember) {
                          e.target.style.background = 'rgba(34, 197, 94, 0.3)';
                        }
                      }}
                    >
                      {alreadyMember ? '✓ Membre' : '➕ Rejoindre'}
                    </button>
                  );
                })()}

                <button
                  onClick={() => setSelectedGuilde(null)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: `1px solid ${currentTheme.accent}`,
                    borderRadius: '10px',
                    color: currentTheme.accent,
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

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
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    background: settingsTab === tab.id
                      ? 'rgba(59, 130, 246, 0.2)'
                      : currentTheme.cardBg,
                    border: `1px solid ${settingsTab === tab.id
                      ? 'rgba(59, 130, 246, 0.4)'
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
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
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
                      background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'; }}
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6', margin: 0 }}>Lvl {progress.userLevel}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>XP Total</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>{progress.totalXP} XP</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Racha</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>🔥 {progress.streak}</p>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: currentTheme.border,
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '11px', color: currentTheme.textSecondary, margin: '0 0 4px 0' }}>Badges</p>
                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#a78bfa', margin: 0 }}>{progress.badges?.length || 0}</p>
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
                            background: hideStats ? '#3b82f6' : '#6b7280',
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
                            background: shareProgress ? '#3b82f6' : '#6b7280',
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
                            background: academyNotifications ? '#3b82f6' : '#6b7280',
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
                        Sécurité supplémentaire
                      </p>
                    </div>
                    <button style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: currentTheme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Activer
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
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: currentTheme.accent,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)';
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#f43f5e', margin: '0 0 8px 0' }}>
                      ⚠️ Zone Danger
                    </p>
                    <button style={{
                      padding: '10px 20px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: '8px',
                      color: '#f43f5e',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      Supprimer mon compte
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLACEHOLDERS FOR OTHER TABS */}
        {(['projects', 'risk'].includes(activeTab)) && (
          <div style={{
            background: currentTheme.cardBg,
            borderRadius: '16px',
            padding: '60px 40px',
            border: `1px solid ${currentTheme.border}`,
            textAlign: 'center',
            marginTop: '20px',
            backdropFilter: 'blur(20px)',
          }}>
            <p style={{
              fontSize: '36px',
              margin: '0 0 16px 0',
            }}>
              {activeTab === 'projects' && '🎯'}
              {activeTab === 'risk' && '⚠️'}
            </p>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: currentTheme.text,
              margin: '0 0 12px 0',
            }}>
              {activeTab === 'projects' && 'Gestion des Projets'}
              {activeTab === 'risk' && 'Analyse des Risques'}
            </h3>
            <p style={{
              fontSize: '14px',
              color: currentTheme.textSecondary,
              margin: 0,
            }}>
              Section en développement
            </p>
          </div>
        )}
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            borderRadius: '48px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
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
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            >
              ✕
            </button>

            {/* Tablet Bezel Top */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '36px 36px 0 0',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              <span>9:41</span>
              <span style={{ fontWeight: '700' }}>InvestKit</span>
              <span>📶 📡 🔋</span>
            </div>

            {/* Modal Tabs */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              padding: '12px 20px',
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <button
                onClick={() => setNewsModalTab('news')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: newsModalTab === 'news' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'news' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'news' ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
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
                  background: newsModalTab === 'tips' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: `1px solid ${newsModalTab === 'tips' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: newsModalTab === 'tips' ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
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
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
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
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderLeft: '4px solid #3b82f6',
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
                          color: '#60a5fa',
                          margin: '0 0 4px 0',
                        }}>
                          CAC 40 en hausse
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          L'indice gagne 1.2% aujourd'hui
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      À l'instant
                    </span>
                  </div>

                  {/* News Item 2 */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderLeft: '4px solid #10b981',
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
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Diversifiez pour réduire les risques
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 2h
                    </span>
                  </div>

                  {/* News Item 3 */}
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    borderLeft: '4px solid #a855f7',
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
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Maîtrisez la crypto
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 5h
                    </span>
                  </div>

                  {/* News Item 4 */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    borderLeft: '4px solid #f59e0b',
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
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          Prix en baisse, opportunité?
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Il y a 1h
                    </span>
                  </div>

                  {/* News Item 5 */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderLeft: '4px solid #3b82f6',
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
                          color: '#60a5fa',
                          margin: '0 0 4px 0',
                        }}>
                          Objectif atteint!
                        </p>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          lineHeight: '1.4',
                        }}>
                          +€5k de gains ce mois
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
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
                        background: 'rgba(168, 85, 247, 0.15)',
                        borderLeft: '4px solid #a855f7',
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
                            color: 'rgba(255, 255, 255, 0.7)',
                            margin: 0,
                            lineHeight: '1.4',
                          }}>
                            {tip.tip}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.5)',
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
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '0 0 36px 36px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '180px',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                margin: '0 auto',
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
