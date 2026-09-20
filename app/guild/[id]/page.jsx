'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEducationProgress } from '@/app/context/EducationContext';
import { useUser } from '@/app/context/UserContext';

export default function GuildPage() {
  const router = useRouter();
  const params = useParams();
  const { progress } = useEducationProgress();
  const { user: userData } = useUser();

  const [guildes, setGuildes] = useState([]);
  const [selectedGuilde, setSelectedGuilde] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [lastGuildeTab, setLastGuildeTab] = useState('info');
  const [guildChatInput, setGuildChatInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [memberActionMenu, setMemberActionMenu] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [editingGuilde, setEditingGuilde] = useState(null);
  const [tempGuildeData, setTempGuildeData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  // 💰 Guild Coins System
  const [guildCoins, setGuildCoins] = useState({});

  // 🎯 Guild Tiers/Levels
  const [guildTier, setGuildTier] = useState('Bronze');

  // 😊 Reactions System
  const [messageReactions, setMessageReactions] = useState({});

  // 💬 Threads System
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);

  // 🟢 Online Status
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [memberStatus, setMemberStatus] = useState({});

  // ❤️ Likes System
  const [messageLikes, setMessageLikes] = useState({});

  // ❓ Q&A Section
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');

  // 💼 Shared Portfolio
  const [sharedPortfolio, setSharedPortfolio] = useState(null);

  // 📈 Performance Dashboard
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // 📋 Collaborative Analysis
  const [analyses, setAnalyses] = useState([]);

  // 📅 Events Calendar
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'event' });

  // 📞 Private Messages
  const [privateMessages, setPrivateMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);

  // 🎨 Guild Customization
  const [guildTheme, setGuildTheme] = useState({
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    bannerEmoji: '🎪',
  });

  // 🔒 Guild Rules
  const [guildRules, setGuildRules] = useState([]);
  const [newRule, setNewRule] = useState('');

  // Load guildes from localStorage
  useEffect(() => {
    try {
      const savedGuildes = localStorage.getItem('guildes');
      if (savedGuildes) {
        const parsed = JSON.parse(savedGuildes);
        setGuildes(parsed);

        const guilde = parsed.find(g => g.id === parseInt(params.id));
        if (guilde) {
          setSelectedGuilde(guilde);
          setPinnedMessages(guilde.pinnedMessages || []);
          setActivityLog(guilde.activityLog || []);
          setAdminLogs(guilde.adminLogs || []);
          setTempGuildeData({
            name: guilde.name,
            emoji: guilde.emoji,
            description: guilde.description,
            minLevel: guilde.restrictions?.minLevel || 1,
            domainRequirements: guilde.restrictions?.domainRequirements || {},
          });
          setGuildCoins(guilde.guildCoins || {});
          setGuildTier(guilde.guildTier || 'Bronze');
          setMessageReactions(guilde.messageReactions || {});
          setThreads(guilde.threads || []);
          setOnlineMembers(guilde.membersList?.map(m => m.id) || []);
          setMemberStatus(guilde.memberStatus || {});
          setMessageLikes(guilde.messageLikes || {});
          setQuestions(guilde.questions || []);
          setSharedPortfolio(guilde.sharedPortfolio || null);
          setPerformanceMetrics(guilde.performanceMetrics || {});
          setAnalyses(guilde.analyses || []);
          setEvents(guilde.events || []);
          setPrivateMessages(guilde.privateMessages || {});
          setGuildTheme(guilde.guildTheme || { primaryColor: '#3b82f6', secondaryColor: '#8b5cf6', bannerEmoji: '🎪' });
          setGuildRules(guilde.guildRules || []);

          // Charger l'onglet sauvegardé
          const savedTab = localStorage.getItem(`guild-${params.id}-tab`);
          if (savedTab) {
            setActiveTab(savedTab);
            setLastGuildeTab(savedTab);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des guildes:', error);
    }
  }, [params.id]);

  // Sauvegarder l'onglet actif
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setLastGuildeTab(tabId);
    localStorage.setItem(`guild-${params.id}-tab`, tabId);
  };

  const isLeader = userData?.name === selectedGuilde?.leader;

  const togglePinnedMessage = (messageId) => {
    const isPinned = pinnedMessages.find(pm => pm.id === messageId);
    const updatedPinned = isPinned
      ? pinnedMessages.filter(pm => pm.id !== messageId)
      : [...pinnedMessages, selectedGuilde.chat.find(m => m.id === messageId)];

    setPinnedMessages(updatedPinned);
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, pinnedMessages: updatedPinned }
        : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, pinnedMessages: updatedPinned }
        : g
    )));
  };

  const addActivity = (type, description) => {
    const newActivity = {
      id: Math.random(),
      type,
      description,
      timestamp: new Date(),
    };
    const updatedActivity = [newActivity, ...activityLog];
    setActivityLog(updatedActivity);
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, activityLog: updatedActivity }
        : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, activityLog: updatedActivity }
        : g
    )));
  };

  const addAdminLog = (action, targetUser = null, details = '') => {
    const newLog = {
      id: Math.random(),
      action,
      targetUser,
      details,
      timestamp: new Date(),
    };
    const updatedLogs = [newLog, ...adminLogs];
    setAdminLogs(updatedLogs);
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, adminLogs: updatedLogs }
        : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, adminLogs: updatedLogs }
        : g
    )));
  };

  const kickMember = (member) => {
    const updatedMembers = selectedGuilde.membersList.filter(m => m.id !== member.id);
    setSelectedGuilde({ ...selectedGuilde, membersList: updatedMembers });
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, membersList: updatedMembers }
        : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, membersList: updatedMembers }
        : g
    )));
    addAdminLog('kick', member.name, `${member.name} a été expulsé`);
    addActivity('join', `${member.name} a été expulsé de la guilde 🚪`);
  };

  const promoteMember = (member, newRole) => {
    const updatedMembers = selectedGuilde.membersList.map(m =>
      m.id === member.id ? { ...m, role: newRole } : m
    );
    setSelectedGuilde({ ...selectedGuilde, membersList: updatedMembers });
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, membersList: updatedMembers }
        : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id
        ? { ...g, membersList: updatedMembers }
        : g
    )));
    addAdminLog('promote', member.name, `Promu en ${newRole}`);
    addActivity('level', `${member.name} a été promu ${newRole} ⬆️`);
  };

  const updateGuildeSettings = () => {
    const updatedGuilde = {
      ...selectedGuilde,
      name: tempGuildeData.name,
      emoji: tempGuildeData.emoji,
      description: tempGuildeData.description,
      restrictions: {
        minLevel: tempGuildeData.minLevel,
        domainRequirements: tempGuildeData.domainRequirements,
      },
    };
    setSelectedGuilde(updatedGuilde);
    setGuildes(guildes.map(g =>
      g.id === selectedGuilde.id ? updatedGuilde : g
    ));
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id ? updatedGuilde : g
    )));
    setEditingGuilde(false);
    addAdminLog('settings', null, 'Paramètres de la guilde modifiés');
  };

  const addGuildCoins = (memberId, amount, reason) => {
    const updated = { ...guildCoins };
    updated[memberId] = (updated[memberId] || 0) + amount;
    setGuildCoins(updated);
    const updatedGuilde = { ...selectedGuilde, guildCoins: updated };
    setSelectedGuilde(updatedGuilde);
    localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
      g.id === selectedGuilde.id ? updatedGuilde : g
    )));
  };

  const addReaction = (messageId, emoji) => {
    const reactions = { ...messageReactions };
    reactions[messageId] = reactions[messageId] || {};
    reactions[messageId][emoji] = (reactions[messageId][emoji] || 0) + 1;
    setMessageReactions(reactions);
  };

  const addLike = (messageId) => {
    const likes = { ...messageLikes };
    likes[messageId] = (likes[messageId] || 0) + 1;
    setMessageLikes(likes);
    addGuildCoins(userData?.id, 1, 'Message likés');
  };

  const postQuestion = (text) => {
    const newQ = {
      id: Math.random(),
      author: userData?.name || 'Anonymous',
      text,
      timestamp: new Date(),
      answers: [],
      likes: 0,
    };
    const updated = [newQ, ...questions];
    setQuestions(updated);
    addGuildCoins(userData?.id, 5, 'Question posée');
  };

  const answerQuestion = (questionId, answerText) => {
    const updated = questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            answers: [...q.answers, {
              id: Math.random(),
              author: userData?.name || 'Anonymous',
              text: answerText,
              timestamp: new Date(),
              likes: 0,
            }],
          }
        : q
    );
    setQuestions(updated);
    addGuildCoins(userData?.id, 3, 'Réponse donnée');
  };

  const createThread = (messageId) => {
    const msg = selectedGuilde.chat?.find(m => m.id === messageId);
    if (!msg) return;
    const newThread = {
      id: Math.random(),
      originalMessageId: messageId,
      originalMessage: msg,
      replies: [],
      createdAt: new Date(),
    };
    setThreads([newThread, ...threads]);
  };

  const replyToThread = (threadId, replyText) => {
    const updated = threads.map(t =>
      t.id === threadId
        ? {
            ...t,
            replies: [...t.replies, {
              id: Math.random(),
              author: userData?.name || 'Anonymous',
              text: replyText,
              timestamp: new Date(),
            }],
          }
        : t
    );
    setThreads(updated);
  };

  const toggleOnlineStatus = (memberId) => {
    if (onlineMembers.includes(memberId)) {
      setOnlineMembers(onlineMembers.filter(id => id !== memberId));
    } else {
      setOnlineMembers([...onlineMembers, memberId]);
    }
  };

  const setMemberStatusMessage = (memberId, status) => {
    setMemberStatus({ ...memberStatus, [memberId]: status });
  };

  const addEvent = (title, date, type) => {
    const newEv = {
      id: Math.random(),
      title,
      date,
      type,
      attendees: [],
      createdBy: userData?.name,
      createdAt: new Date(),
    };
    setEvents([...events, newEv]);
    addActivity('level', `Nouvel événement: ${title} 📅`);
  };

  const rsvpEvent = (eventId) => {
    const updated = events.map(e =>
      e.id === eventId && !e.attendees.includes(userData?.id)
        ? { ...e, attendees: [...e.attendees, userData?.id] }
        : e
    );
    setEvents(updated);
  };

  const sendPrivateMessage = (recipientId, text) => {
    const key = [userData?.id, recipientId].sort().join('-');
    const msgs = privateMessages[key] || [];
    const updated = {
      ...privateMessages,
      [key]: [...msgs, {
        id: Math.random(),
        senderId: userData?.id,
        senderName: userData?.name,
        text,
        timestamp: new Date(),
      }],
    };
    setPrivateMessages(updated);
  };

  const addAnalysis = (title, content) => {
    const newAnalysis = {
      id: Math.random(),
      title,
      content,
      author: userData?.name,
      createdAt: new Date(),
      collaborators: [],
      comments: [],
    };
    setAnalyses([newAnalysis, ...analyses]);
    addGuildCoins(userData?.id, 10, 'Analyse créée');
  };

  const addGuildRule = (rule) => {
    if (isLeader && rule.trim()) {
      setGuildRules([...guildRules, {
        id: Math.random(),
        text: rule,
        createdAt: new Date(),
      }]);
      setNewRule('');
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

  if (!selectedGuilde) {
    return (
      <div style={{
        minHeight: '100vh',
        background: currentTheme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: currentTheme.text,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: '700' }}>Guilde non trouvée</p>
          <Link href="/dashboard" style={{
            color: currentTheme.accent,
            textDecoration: 'none',
            marginTop: '16px',
            display: 'inline-block',
          }}>
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSendMessage = () => {
    if (guildChatInput.trim()) {
      const newMessage = {
        id: (selectedGuilde.chat?.length || 0) + 1,
        author: 'SMC.SRB',
        message: guildChatInput,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setGuildes(guildes.map(g =>
        g.id === selectedGuilde.id
          ? { ...g, chat: [...(g.chat || []), newMessage] }
          : g
      ));

      setSelectedGuilde({
        ...selectedGuilde,
        chat: [...(selectedGuilde.chat || []), newMessage],
      });

      localStorage.setItem('guildes', JSON.stringify(guildes.map(g =>
        g.id === selectedGuilde.id
          ? { ...g, chat: [...(g.chat || []), newMessage] }
          : g
      )));

      addActivity('message', `${newMessage.author} a envoyé un message 💬`);
      setGuildChatInput('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.bg,
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={() => {
                localStorage.setItem(`guild-${params.id}-tab`, activeTab);
                router.push('/dashboard?tab=guildes');
              }}
              style={{
                color: currentTheme.accent,
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              ← Retour
            </button>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${currentTheme.accent} 0%, #8b5cf6 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}>
              {selectedGuilde.emoji}
            </div>
            <div>
              <h1 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '28px',
                margin: '0 0 4px 0',
              }}>
                {selectedGuilde.name}
              </h1>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '14px',
                margin: 0,
              }}>
                👥 {selectedGuilde.membersList?.length || 0} membre{(selectedGuilde.membersList?.length || 0) > 1 ? 's' : ''} • Niveau {selectedGuilde.level} • {selectedGuilde.totalXP} XP
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: `1px solid ${currentTheme.border}`,
          paddingBottom: '12px',
        }}>
          {[
            { id: 'info', label: '📊 Info', icon: '📊' },
            { id: 'members', label: '👥 Membres', icon: '👥' },
            { id: 'announcements', label: '📌 Annonces', icon: '📌' },
            { id: 'stats', label: '📈 Stats', icon: '📈' },
            { id: 'activity', label: '📊 Activité', icon: '📊' },
            { id: 'coins', label: '💰 Coins', icon: '💰' },
            { id: 'tiers', label: '🎯 Paliers', icon: '🎯' },
            { id: 'chat', label: '💬 Chat', icon: '💬' },
            { id: 'qa', label: '❓ Q&A', icon: '❓' },
            { id: 'portfolio', label: '💼 Portfolio', icon: '💼' },
            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
            { id: 'analyses', label: '📋 Analyses', icon: '📋' },
            { id: 'events', label: '📅 Événements', icon: '📅' },
            { id: 'messages', label: '📞 Messages', icon: '📞' },
            { id: 'customize', label: '🎨 Perso', icon: '🎨' },
            { id: 'rules', label: '🔒 Règles', icon: '🔒' },
            ...(isLeader ? [{ id: 'admin', label: '⚙️ Admin', icon: '⚙️' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab.id ? currentTheme.accent : 'transparent',
                border: activeTab === tab.id ? 'none' : `1px solid ${currentTheme.border}`,
                borderRadius: '8px',
                color: activeTab === tab.id ? '#fff' : currentTheme.text,
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'info' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '24px',
          }}>
            {/* Description */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 12px 0',
              }}>
                À propos
              </h2>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '14px',
                lineHeight: '1.6',
                margin: 0,
              }}>
                {selectedGuilde.description}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 12px 0',
              }}>
                Statistiques
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{
                    color: currentTheme.textSecondary,
                    fontSize: '12px',
                    margin: '0 0 4px 0',
                  }}>
                    Progression
                  </p>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(selectedGuilde.level / 20) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${currentTheme.accent}, #8b5cf6)`,
                    }} />
                  </div>
                  <p style={{
                    color: currentTheme.text,
                    fontSize: '12px',
                    fontWeight: '600',
                    margin: '4px 0 0 0',
                  }}>
                    Niveau {selectedGuilde.level}/20
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {selectedGuilde.restrictions && (
              <div style={{
                padding: '20px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                border: `1px solid rgba(59, 130, 246, 0.3)`,
                gridColumn: '1 / -1',
              }}>
                <h2 style={{
                  color: currentTheme.accent,
                  fontWeight: '700',
                  fontSize: '16px',
                  margin: '0 0 12px 0',
                }}>
                  🔒 Conditions d'accès
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                }}>
                  {selectedGuilde.restrictions.minLevel > 1 && (
                    <div>
                      <p style={{
                        color: currentTheme.textSecondary,
                        fontSize: '12px',
                        margin: '0 0 4px 0',
                      }}>
                        Niveau
                      </p>
                      <p style={{
                        color: currentTheme.text,
                        fontWeight: '600',
                        fontSize: '14px',
                        margin: 0,
                      }}>
                        {selectedGuilde.restrictions.minLevel}+ {progress.userLevel >= selectedGuilde.restrictions.minLevel ? '✓' : '✗'}
                      </p>
                    </div>
                  )}
                  {Object.entries(selectedGuilde.restrictions.domainRequirements || {}).map(([domain, requirement]) => {
                    if (requirement > 0) {
                      const domainLabel = domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto';
                      return (
                        <div key={domain}>
                          <p style={{
                            color: currentTheme.textSecondary,
                            fontSize: '12px',
                            margin: '0 0 4px 0',
                          }}>
                            {domainLabel}
                          </p>
                          <p style={{
                            color: currentTheme.text,
                            fontWeight: '600',
                            fontSize: '14px',
                            margin: 0,
                          }}>
                            {requirement}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div style={{
            display: 'grid',
            gap: '12px',
          }}>
            {selectedGuilde.membersList?.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: '16px',
                  background: currentTheme.cardBg,
                  borderRadius: '10px',
                  border: `1px solid ${currentTheme.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{
                    color: currentTheme.text,
                    fontWeight: '600',
                    fontSize: '14px',
                    margin: '0 0 4px 0',
                  }}>
                    {member.name}
                  </p>
                  <p style={{
                    color: currentTheme.textSecondary,
                    fontSize: '12px',
                    margin: 0,
                  }}>
                    Niveau {member.level} • Rejoint: {member.joinedDate}
                  </p>
                </div>
                <span style={{
                  fontSize: '11px',
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
              </div>
            ))}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {pinnedMessages.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: currentTheme.cardBg,
                borderRadius: '12px',
                border: `1px solid ${currentTheme.border}`,
              }}>
                <p style={{
                  color: currentTheme.textSecondary,
                  fontSize: '14px',
                  margin: 0,
                }}>
                  📌 Aucune annonce épinglée pour le moment
                </p>
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)',
                    borderRadius: '12px',
                    border: `2px solid rgba(251, 191, 36, 0.3)`,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}>
                        <span style={{
                          fontSize: '20px',
                        }}>
                          📌
                        </span>
                        <p style={{
                          color: currentTheme.text,
                          fontWeight: '700',
                          fontSize: '16px',
                          margin: 0,
                        }}>
                          {msg.author}
                        </p>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#fbbf24',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '2px 6px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          borderRadius: '4px',
                        }}>
                          Leader
                        </span>
                      </div>
                      <p style={{
                        color: currentTheme.text,
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: '0 0 12px 0',
                      }}>
                        {msg.message}
                      </p>
                      <p style={{
                        color: currentTheme.textSecondary,
                        fontSize: '12px',
                        margin: 0,
                      }}>
                        {msg.timestamp}
                      </p>
                    </div>
                    {isLeader && (
                      <button
                        onClick={() => togglePinnedMessage(msg.id)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          border: `1px solid rgba(251, 191, 36, 0.4)`,
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(251, 191, 36, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(251, 191, 36, 0.2)';
                        }}
                      >
                        Dépingler
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}>
            {/* Total XP */}
            <div style={{
              padding: '24px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
              textAlign: 'center',
            }}>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
              }}>
                Total XP Gagné
              </p>
              <p style={{
                color: currentTheme.accent,
                fontSize: '36px',
                fontWeight: '700',
                margin: 0,
              }}>
                {selectedGuilde.totalXP}
              </p>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '8px 0 0 0',
              }}>
                💪 Niveau {selectedGuilde.level}/20
              </p>
            </div>

            {/* Domains Completed */}
            <div style={{
              padding: '24px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
              textAlign: 'center',
            }}>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
              }}>
                Domaines Complétés
              </p>
              <p style={{
                color: currentTheme.accent,
                fontSize: '36px',
                fontWeight: '700',
                margin: 0,
              }}>
                {selectedGuilde.domainsCompleted || 0}/4
              </p>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '8px 0 0 0',
              }}>
                ✅ Progression
              </p>
            </div>

            {/* Most Active Member */}
            <div style={{
              padding: '24px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
              textAlign: 'center',
            }}>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
              }}>
                Membre le Plus Actif
              </p>
              <p style={{
                color: currentTheme.text,
                fontSize: '16px',
                fontWeight: '700',
                margin: '0 0 8px 0',
              }}>
                {selectedGuilde.membersList && selectedGuilde.membersList.length > 0
                  ? selectedGuilde.membersList[0].name
                  : 'N/A'}
              </p>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '8px 0 0 0',
              }}>
                ⭐ {selectedGuilde.membersList && selectedGuilde.membersList.length > 0
                  ? selectedGuilde.membersList[0].level
                  : 0} Niveau
              </p>
            </div>

            {/* Global Progression */}
            <div style={{
              padding: '24px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
              textAlign: 'center',
            }}>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
              }}>
                Progression Globale
              </p>
              <p style={{
                color: currentTheme.accent,
                fontSize: '36px',
                fontWeight: '700',
                margin: 0,
              }}>
                {Math.round((selectedGuilde.level / 20) * 100)}%
              </p>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '12px',
              }}>
                <div style={{
                  width: `${(selectedGuilde.level / 20) * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${currentTheme.accent}, #8b5cf6)`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {activityLog.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: currentTheme.cardBg,
                borderRadius: '12px',
                border: `1px solid ${currentTheme.border}`,
              }}>
                <p style={{
                  color: currentTheme.textSecondary,
                  fontSize: '14px',
                  margin: 0,
                }}>
                  📊 Aucune activité pour le moment
                </p>
              </div>
            ) : (
              activityLog.map((activity) => {
                const timeAgo = Math.floor((new Date() - new Date(activity.timestamp)) / 1000);
                let timeDisplay = '';
                if (timeAgo < 60) timeDisplay = 'À l\'instant';
                else if (timeAgo < 3600) timeDisplay = `${Math.floor(timeAgo / 60)}m`;
                else if (timeAgo < 86400) timeDisplay = `${Math.floor(timeAgo / 3600)}h`;
                else timeDisplay = `${Math.floor(timeAgo / 86400)}j`;

                return (
                  <div
                    key={activity.id}
                    style={{
                      padding: '16px',
                      background: currentTheme.cardBg,
                      borderRadius: '10px',
                      border: `1px solid ${currentTheme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{
                        color: currentTheme.text,
                        fontWeight: '600',
                        fontSize: '14px',
                        margin: '0 0 4px 0',
                      }}>
                        {activity.description}
                      </p>
                      <p style={{
                        color: currentTheme.textSecondary,
                        fontSize: '12px',
                        margin: 0,
                      }}>
                        {timeDisplay}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '18px',
                      opacity: 0.7,
                    }}>
                      {activity.type === 'message' ? '💬' : activity.type === 'join' ? '🎉' : activity.type === 'level' ? '⬆️' : '✨'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'admin' && isLeader && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}>
            {/* Gestion des Membres */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 16px 0',
              }}>
                👥 Gestion des Membres
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
              }}>
                {selectedGuilde.membersList?.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{
                        color: currentTheme.text,
                        fontWeight: '600',
                        fontSize: '13px',
                        margin: '0 0 2px 0',
                      }}>
                        {member.name}
                      </p>
                      <p style={{
                        color: currentTheme.textSecondary,
                        fontSize: '11px',
                        margin: 0,
                      }}>
                        {member.role}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                    }}>
                      {member.role !== 'Leader' && (
                        <>
                          {member.role !== 'Co-leader' && (
                            <button
                              onClick={() => {
                                setShowConfirmDialog({
                                  action: 'promote',
                                  member,
                                  newRole: 'Co-leader',
                                });
                              }}
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(96, 165, 250, 0.2)',
                                border: '1px solid rgba(96, 165, 250, 0.4)',
                                borderRadius: '4px',
                                color: '#60a5fa',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '10px',
                              }}
                            >
                              Co-L
                            </button>
                          )}
                          {member.role !== 'Elder' && (
                            <button
                              onClick={() => {
                                setShowConfirmDialog({
                                  action: 'promote',
                                  member,
                                  newRole: 'Elder',
                                });
                              }}
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(129, 140, 248, 0.2)',
                                border: '1px solid rgba(129, 140, 248, 0.4)',
                                borderRadius: '4px',
                                color: '#818cf8',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '10px',
                              }}
                            >
                              Elder
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowConfirmDialog({
                                action: 'kick',
                                member,
                              });
                            }}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              color: '#ef4444',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '10px',
                            }}
                          >
                            Kick
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personnalisation */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 16px 0',
              }}>
                ✏️ Personnalisation
              </h2>
              {!editingGuilde ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div>
                    <p style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}>
                      Nom
                    </p>
                    <p style={{
                      color: currentTheme.text,
                      fontWeight: '600',
                      fontSize: '14px',
                      margin: 0,
                    }}>
                      {selectedGuilde.name}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}>
                      Emoji
                    </p>
                    <p style={{
                      fontSize: '28px',
                      margin: 0,
                    }}>
                      {selectedGuilde.emoji}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}>
                      Description
                    </p>
                    <p style={{
                      color: currentTheme.text,
                      fontSize: '13px',
                      lineHeight: '1.4',
                      margin: 0,
                    }}>
                      {selectedGuilde.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingGuilde(true)}
                    style={{
                      padding: '10px 16px',
                      background: currentTheme.accent,
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px',
                      marginTop: '8px',
                    }}
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div>
                    <label style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Nom
                    </label>
                    <input
                      type="text"
                      value={tempGuildeData?.name || ''}
                      onChange={(e) => setTempGuildeData({
                        ...tempGuildeData,
                        name: e.target.value,
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        color: currentTheme.text,
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Emoji
                    </label>
                    <input
                      type="text"
                      maxLength="2"
                      value={tempGuildeData?.emoji || ''}
                      onChange={(e) => setTempGuildeData({
                        ...tempGuildeData,
                        emoji: e.target.value,
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        color: currentTheme.text,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      color: currentTheme.textSecondary,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Description
                    </label>
                    <textarea
                      value={tempGuildeData?.description || ''}
                      onChange={(e) => setTempGuildeData({
                        ...tempGuildeData,
                        description: e.target.value,
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        color: currentTheme.text,
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        minHeight: '60px',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                  }}>
                    <button
                      onClick={updateGuildeSettings}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: currentTheme.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditingGuilde(false)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        color: currentTheme.text,
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Gestion des Règles */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 16px 0',
              }}>
                🔒 Règles d'Accès
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div>
                  <label style={{
                    color: currentTheme.textSecondary,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '6px',
                  }}>
                    Niveau Minimum: {tempGuildeData?.minLevel}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={tempGuildeData?.minLevel || 1}
                    onChange={(e) => setTempGuildeData({
                      ...tempGuildeData,
                      minLevel: parseInt(e.target.value),
                    })}
                    style={{
                      width: '100%',
                    }}
                  />
                </div>
                <div>
                  <p style={{
                    color: currentTheme.textSecondary,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    margin: '0 0 8px 0',
                  }}>
                    Domaines Requis
                  </p>
                  {['realestate', 'crypto', 'stocks', 'bonds'].map((domain) => {
                    const domainLabel = domain === 'realestate' ? 'Immobilier' : domain === 'stocks' ? 'Bourse' : domain === 'bonds' ? 'Obligations' : 'Crypto';
                    return (
                      <div key={domain} style={{ marginBottom: '8px' }}>
                        <label style={{
                          color: currentTheme.text,
                          fontSize: '12px',
                          marginBottom: '4px',
                          display: 'block',
                        }}>
                          {domainLabel}: {tempGuildeData?.domainRequirements?.[domain] || 0}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={tempGuildeData?.domainRequirements?.[domain] || 0}
                          onChange={(e) => setTempGuildeData({
                            ...tempGuildeData,
                            domainRequirements: {
                              ...tempGuildeData.domainRequirements,
                              [domain]: parseInt(e.target.value),
                            },
                          })}
                          style={{
                            width: '100%',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Historique des Actions */}
            <div style={{
              padding: '20px',
              background: currentTheme.cardBg,
              borderRadius: '12px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 0 16px 0',
              }}>
                📋 Journal des Actions
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {adminLogs.length === 0 ? (
                  <p style={{
                    color: currentTheme.textSecondary,
                    fontSize: '12px',
                    margin: 0,
                  }}>
                    Aucune action enregistrée
                  </p>
                ) : (
                  adminLogs.map((log) => {
                    const timeAgo = Math.floor((new Date() - new Date(log.timestamp)) / 1000);
                    let timeDisplay = '';
                    if (timeAgo < 60) timeDisplay = 'À l\'instant';
                    else if (timeAgo < 3600) timeDisplay = `${Math.floor(timeAgo / 60)}m`;
                    else if (timeAgo < 86400) timeDisplay = `${Math.floor(timeAgo / 3600)}h`;
                    else timeDisplay = `${Math.floor(timeAgo / 86400)}j`;

                    const actionLabel = log.action === 'kick' ? '🚪' : log.action === 'promote' ? '⬆️' : log.action === 'settings' ? '⚙️' : '📝';

                    return (
                      <div
                        key={log.id}
                        style={{
                          padding: '8px',
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <p style={{
                              color: currentTheme.text,
                              fontWeight: '600',
                              margin: '0 0 2px 0',
                            }}>
                              {actionLabel} {log.action.toUpperCase()}
                            </p>
                            {log.targetUser && (
                              <p style={{
                                color: currentTheme.textSecondary,
                                margin: '0 0 2px 0',
                              }}>
                                {log.targetUser}
                              </p>
                            )}
                            {log.details && (
                              <p style={{
                                color: currentTheme.textSecondary,
                                margin: 0,
                              }}>
                                {log.details}
                              </p>
                            )}
                          </div>
                          <p style={{
                            color: currentTheme.textSecondary,
                            margin: 0,
                            whiteSpace: 'nowrap',
                          }}>
                            {timeDisplay}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
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
          }}>
            <div style={{
              background: currentTheme.bg,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              border: `1px solid ${currentTheme.border}`,
            }}>
              <h2 style={{
                color: currentTheme.text,
                fontWeight: '700',
                fontSize: '18px',
                margin: '0 0 12px 0',
              }}>
                {showConfirmDialog.action === 'kick' ? '⚠️ Confirmer l\'expulsion' : '⬆️ Confirmer la promotion'}
              </h2>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '14px',
                margin: '0 0 16px 0',
              }}>
                {showConfirmDialog.action === 'kick'
                  ? `Êtes-vous sûr de vouloir expulser ${showConfirmDialog.member.name} de la guilde?`
                  : `Promouvoir ${showConfirmDialog.member.name} en ${showConfirmDialog.newRole}?`}
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <button
                  onClick={() => {
                    if (showConfirmDialog.action === 'kick') {
                      kickMember(showConfirmDialog.member);
                    } else {
                      promoteMember(showConfirmDialog.member, showConfirmDialog.newRole);
                    }
                    setShowConfirmDialog(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: showConfirmDialog.action === 'kick' ? 'rgba(239, 68, 68, 0.3)' : currentTheme.accent,
                    border: `1px solid ${showConfirmDialog.action === 'kick' ? 'rgba(239, 68, 68, 0.5)' : currentTheme.accent}`,
                    borderRadius: '8px',
                    color: showConfirmDialog.action === 'kick' ? '#ef4444' : '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '8px',
                    color: currentTheme.text,
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coins' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '18px', margin: '0 0 16px 0' }}>💰 Mes Coins</h2>
              <p style={{ color: currentTheme.accent, fontSize: '32px', fontWeight: '700', margin: '0 0 12px 0' }}>{guildCoins[userData?.id] || 0}</p>
              <p style={{ color: currentTheme.textSecondary, fontSize: '13px', margin: 0 }}>Coins disponibles dans la guilde</p>
            </div>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '18px', margin: '0 0 16px 0' }}>🛍️ Boutique</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <p style={{ color: currentTheme.text, fontWeight: '600', fontSize: '13px', margin: '0 0 4px 0' }}>Badge Spécial</p>
                  <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>50 coins</p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <p style={{ color: currentTheme.text, fontWeight: '600', fontSize: '13px', margin: '0 0 4px 0' }}>2x XP Boost</p>
                  <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>100 coins</p>
                </div>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 16px 0' }}>💳 Classement par Coins</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(guildCoins).slice(0, 5).map(([memberId, coins], idx) => (
                  <div key={memberId} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ color: currentTheme.text, fontWeight: '600', fontSize: '13px', margin: 0 }}>#{idx + 1} Membre</p>
                    <p style={{ color: currentTheme.accent, fontWeight: '700', fontSize: '13px', margin: 0 }}>{coins} 💰</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tiers' && (
          <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
            <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '18px', margin: '0 0 20px 0' }}>🎯 Paliers de Guilde</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier, idx) => (
                <div key={tier} style={{
                  padding: '20px',
                  background: tier === guildTier ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.2)',
                  borderRadius: '10px',
                  border: tier === guildTier ? `2px solid ${currentTheme.accent}` : `1px solid ${currentTheme.border}`,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}>
                  <p style={{ fontSize: '28px', margin: '0 0 8px 0' }}>{'🥉🥈🥇💎'[idx]}</p>
                  <p style={{ color: currentTheme.text, fontWeight: '700', fontSize: '14px', margin: '0 0 8px 0' }}>{tier}</p>
                  <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>Niveau {(idx + 1) * 5}/20</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
              <h3 style={{ color: currentTheme.text, fontWeight: '600', fontSize: '14px', margin: '0 0 12px 0' }}>📊 Bénéfices Débloqués</h3>
              <ul style={{ color: currentTheme.textSecondary, fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
                <li>✅ +10% XP au tier Silver</li>
                <li>✅ Accès Premium au tier Gold</li>
                <li>✅ Statut Elite au tier Platinum</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}`, height: 'fit-content' }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 12px 0' }}>❓ Poser une Question</h2>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Votre question..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  color: currentTheme.text,
                  fontSize: '13px',
                  minHeight: '100px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => { if (newQuestion.trim()) { postQuestion(newQuestion); setNewQuestion(''); } }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '10px',
                  background: currentTheme.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Envoyer
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((q) => (
                <div key={q.id} style={{ padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <p style={{ color: currentTheme.text, fontWeight: '600', fontSize: '13px', margin: 0 }}>{q.author}</p>
                    <p style={{ color: currentTheme.accent, fontWeight: '700', fontSize: '12px', margin: 0 }}>❤️ {q.likes}</p>
                  </div>
                  <p style={{ color: currentTheme.text, fontSize: '13px', margin: '0 0 8px 0' }}>{q.text}</p>
                  <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>{q.answers.length} réponses</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
            <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '18px', margin: '0 0 16px 0' }}>💼 Portefeuille Collectif</h2>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
              <p style={{ color: currentTheme.textSecondary, fontSize: '12px', margin: '0 0 8px 0' }}>Portefeuille Commun</p>
              <p style={{ color: currentTheme.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>+15.2%</p>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
              <p style={{ color: currentTheme.text, fontWeight: '600', fontSize: '13px', margin: '0 0 12px 0' }}>🗳️ Votes Actifs</p>
              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', marginBottom: '8px' }}>
                <p style={{ color: currentTheme.text, fontSize: '12px', margin: '0 0 4px 0' }}>Acheter Bitcoin?</p>
                <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: 0 }}>8 votes pour - 2 votes contre</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: '0 0 8px 0' }}>Performance</p>
              <p style={{ color: currentTheme.accent, fontSize: '28px', fontWeight: '700', margin: 0 }}>+8.3%</p>
            </div>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: '0 0 8px 0' }}>Croissance XP</p>
              <p style={{ color: currentTheme.accent, fontSize: '28px', fontWeight: '700', margin: 0 }}>↑ 2500</p>
            </div>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: '0 0 8px 0' }}>Engagement</p>
              <p style={{ color: currentTheme.accent, fontSize: '28px', fontWeight: '700', margin: 0 }}>94%</p>
            </div>
          </div>
        )}

        {activeTab === 'analyses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
              <h3 style={{ color: currentTheme.text, fontWeight: '600', fontSize: '14px', margin: '0 0 8px 0' }}>📋 Nouvelles Analyses</h3>
              <textarea
                placeholder="Créer une analyse collaborative..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  color: currentTheme.text,
                  fontSize: '13px',
                  minHeight: '80px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {analyses.map((a) => (
              <div key={a.id} style={{ padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
                <h3 style={{ color: currentTheme.text, fontWeight: '600', fontSize: '14px', margin: '0 0 4px 0' }}>{a.title}</h3>
                <p style={{ color: currentTheme.textSecondary, fontSize: '11px', margin: '0 0 8px 0' }}>Par {a.author}</p>
                <p style={{ color: currentTheme.text, fontSize: '12px', margin: 0 }}>{a.content.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}`, height: 'fit-content' }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 12px 0' }}>📅 Créer un Événement</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Titre"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '6px',
                    color: currentTheme.text,
                    fontSize: '12px',
                  }}
                />
                <input
                  type="datetime-local"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '6px',
                    color: currentTheme.text,
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => { if (newEvent.title && newEvent.date) { addEvent(newEvent.title, newEvent.date, 'event'); setNewEvent({ title: '', date: '', type: 'event' }); } }}
                  style={{
                    padding: '8px',
                    background: currentTheme.accent,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Créer
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((e) => (
                <div key={e.id} style={{ padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h3 style={{ color: currentTheme.text, fontWeight: '600', fontSize: '14px', margin: 0 }}>{e.title}</h3>
                    <button
                      onClick={() => rsvpEvent(e.id)}
                      style={{
                        padding: '4px 12px',
                        background: e.attendees.includes(userData?.id) ? currentTheme.accent : 'rgba(0,0,0,0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: e.attendees.includes(userData?.id) ? '#fff' : currentTheme.text,
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {e.attendees.includes(userData?.id) ? '✓ RSVP' : 'RSVP'}
                    </button>
                  </div>
                  <p style={{ color: currentTheme.textSecondary, fontSize: '12px', margin: 0 }}>📅 {new Date(e.date).toLocaleString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', minHeight: '500px' }}>
            <div style={{ padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
              <h3 style={{ color: currentTheme.text, fontWeight: '600', fontSize: '14px', margin: '0 0 12px 0' }}>📞 Contacts</h3>
              {selectedGuilde.membersList?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedUser(m.id)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '8px',
                    background: selectedUser === m.id ? currentTheme.accent : 'rgba(0,0,0,0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    color: selectedUser === m.id ? '#fff' : currentTheme.text,
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {selectedUser && (
              <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: currentTheme.cardBg, borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
                <div style={{ flex: 1, marginBottom: '16px', overflowY: 'auto', maxHeight: '400px' }}>
                  {/* Messages displayed here */}
                  <p style={{ color: currentTheme.textSecondary, fontSize: '12px', textAlign: 'center', margin: 0 }}>Conversation privée</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Message privé..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.2)',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '6px',
                      color: currentTheme.text,
                      fontSize: '12px',
                    }}
                  />
                  <button
                    style={{
                      padding: '8px 16px',
                      background: currentTheme.accent,
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customize' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 16px 0' }}>🎨 Thème</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ color: currentTheme.textSecondary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Couleur Primaire</label>
                  <input type="color" value={guildTheme.primaryColor} onChange={(e) => setGuildTheme({ ...guildTheme, primaryColor: e.target.value })} style={{ width: '100%', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ color: currentTheme.textSecondary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Couleur Secondaire</label>
                  <input type="color" value={guildTheme.secondaryColor} onChange={(e) => setGuildTheme({ ...guildTheme, secondaryColor: e.target.value })} style={{ width: '100%', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 16px 0' }}>👀 Aperçu</h2>
              <div style={{
                padding: '20px',
                background: `linear-gradient(135deg, ${guildTheme.primaryColor} 0%, ${guildTheme.secondaryColor} 100%)`,
                borderRadius: '10px',
                textAlign: 'center',
                color: '#fff',
              }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px 0' }}>{guildTheme.bannerEmoji}</p>
                <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>Aperçu de Votre Guilde</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div style={{ display: 'grid', gridTemplateColumns: isLeader ? '1fr 1fr' : '1fr', gap: '24px' }}>
            {isLeader && (
              <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}`, height: 'fit-content' }}>
                <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 12px 0' }}>➕ Ajouter Règle</h2>
                <textarea
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Nouvelle règle..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '8px',
                    color: currentTheme.text,
                    fontSize: '12px',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => addGuildRule(newRule)}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    background: currentTheme.accent,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Ajouter
                </button>
              </div>
            )}
            <div style={{ padding: '20px', background: currentTheme.cardBg, borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
              <h2 style={{ color: currentTheme.text, fontWeight: '700', fontSize: '16px', margin: '0 0 16px 0' }}>🔒 Règles de la Guilde</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {guildRules.length === 0 ? (
                  <p style={{ color: currentTheme.textSecondary, fontSize: '12px', margin: 0 }}>Aucune règle définie</p>
                ) : (
                  guildRules.map((r, idx) => (
                    <div key={r.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <p style={{ color: currentTheme.text, fontSize: '12px', margin: '0 0 4px 0', fontWeight: '600' }}>#{idx + 1}</p>
                      <p style={{ color: currentTheme.text, fontSize: '12px', margin: 0 }}>{r.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Chat Messages */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '500px',
              overflowY: 'auto',
              paddingRight: '8px',
            }}>
              {selectedGuilde.chat?.map((msg) => {
                const isCurrentUser = msg.author === 'SMC.SRB';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '60%',
                      padding: '12px 16px',
                      background: isCurrentUser
                        ? currentTheme.accent
                        : 'rgba(59, 130, 246, 0.1)',
                      color: isCurrentUser ? '#fff' : currentTheme.text,
                      borderRadius: isCurrentUser
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      wordBreak: 'break-word',
                    }}>
                      {!isCurrentUser && (
                        <p style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: isCurrentUser ? 'rgba(255, 255, 255, 0.8)' : currentTheme.textSecondary,
                          margin: '0 0 4px 0',
                        }}>
                          {msg.author}
                        </p>
                      )}
                      <p style={{
                        fontSize: '13px',
                        lineHeight: '1.4',
                        margin: 0,
                      }}>
                        {msg.message}
                      </p>
                      <p style={{
                        fontSize: '10px',
                        color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : currentTheme.textSecondary,
                        margin: '4px 0 0 0',
                      }}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <div style={{
              display: 'flex',
              gap: '8px',
              paddingTop: '16px',
              borderTop: `1px solid ${currentTheme.border}`,
            }}>
              <input
                type="text"
                placeholder="Envoyer un message..."
                value={guildChatInput}
                onChange={(e) => setGuildChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  color: currentTheme.text,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  padding: '12px 20px',
                  background: currentTheme.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
              >
                📤 Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
