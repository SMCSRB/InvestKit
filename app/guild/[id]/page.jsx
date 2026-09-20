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
  const [guildChatInput, setGuildChatInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [memberActionMenu, setMemberActionMenu] = useState(null);

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
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des guildes:', error);
    }
  }, [params.id]);

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
            <Link href="/dashboard" style={{
              color: currentTheme.accent,
              fontSize: '20px',
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: '600',
            }}>
              ←
            </Link>
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
            { id: 'chat', label: '💬 Chat', icon: '💬' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
