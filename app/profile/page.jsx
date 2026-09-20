'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEducationProgress } from '@/app/context/EducationContext';
import { useNotification } from '@/app/context/NotificationContext';
import { educationDomains } from '@/data/education';
import { themes, getUnlockedThemes, getNextTheme } from '@/data/themes';
import PageWrapper from '@/app/components/PageWrapper';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { progress, isChapterCompleted, getChapterScore, isDomainCompleted, isLoading, setSelectedTheme } = useEducationProgress();
  const { addNotification } = useNotification();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState({
    darkMode: true,
    notificationsEnabled: true,
    soundEnabled: true,
    remindersEnabled: true,
    profilePublic: true,
    emailNotifications: false,
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState('display');
  const [profileData, setProfileData] = useState({
    username: 'InvestKitUser',
    bio: 'Passionné par l\'investissement et l\'apprentissage 🚀',
    avatar: '👤',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings((prev) => ({
        ...prev,
        ...JSON.parse(savedSettings),
      }));
    }
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfileData((prev) => ({
        ...prev,
        ...JSON.parse(savedProfile),
      }));
    }
  }, [router]);

  const saveProfileData = (newData) => {
    setProfileData(newData);
    localStorage.setItem('userProfile', JSON.stringify(newData));
    setIsEditingProfile(false);
    addNotification('Profil mis à jour ✓', 'success', 2000);
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    addNotification('Paramètre mis à jour ✓', 'success', 2000);
  };

  if (!isAuthenticated || isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded w-64 mb-4" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const badgeInfo = {
    first_blood: { name: 'Premier Sang', emoji: '🩸', description: 'Premier chapitre complété' },
    perfect: { name: 'Parfait', emoji: '💯', description: 'Obtenu un score de 100%' },
    no_mistakes: { name: 'Sans Erreurs', emoji: '⭐', description: '3+ chapitres d\'affilée' },
  };

  const totalChaptersCompleted = progress.completedChapters.length;
  const totalDomainsCompleted = progress.completedDomains.length;

  const copyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      alert('Lien du profil copié! 📋');
    });
  };

  const shareProfile = () => {
    const message = `Viens rejoindre moi sur InvestKit! J'ai déjà atteint le niveau ${progress.userLevel} avec ${progress.totalXP} XP! 🚀`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://twitter.com/intent/tweet?text=${encodedMessage}`, '_blank', 'width=600,height=400');
  };

  return (
    <PageWrapper animation="fade-in-up">
      <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Header with back link */}
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 mb-8 inline-flex items-center gap-2"
          >
            ← Retour
          </Link>

          {/* Profile Header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="text-8xl">{profileData.avatar}</div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{profileData.username}</h1>
                  <p className="text-gray-400 mb-3">{profileData.bio}</p>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300"
                  >
                    ✏️ Modifier le profil
                  </button>
                </div>
              </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditingProfile && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
                  <h3 className="text-2xl font-bold text-white mb-6">Modifier le Profil</h3>

                  <div className="space-y-4">
                    {/* Avatar Selection */}
                    <div>
                      <label className="block text-white font-semibold mb-2">Avatar</label>
                      <div className="grid grid-cols-6 gap-2">
                        {['👤', '👨', '👩', '🧑', '🎭', '⭐'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setProfileData({ ...profileData, avatar: emoji })}
                            className={`text-3xl p-2 rounded-lg transition-all duration-300 ${
                              profileData.avatar === emoji
                                ? 'bg-blue-600'
                                : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-white font-semibold mb-2">Username</label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                        placeholder="Votre username"
                      />
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-white font-semibold mb-2">Bio</label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                        placeholder="Parlez-nous de vous..."
                        rows="3"
                      />
                      <p className="text-gray-400 text-xs mt-1">{profileData.bio.length}/150 caractères</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => saveProfileData(profileData)}
                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all duration-300"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm font-semibold">Niveau</p>
                <p className="text-white text-3xl font-bold">{progress.userLevel}</p>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm font-semibold">XP Total</p>
                <p className="text-white text-3xl font-bold">{progress.totalXP}</p>
              </div>
              <div className="bg-orange-900/30 border border-orange-400/30 rounded-lg p-4">
                <p className="text-orange-300 text-sm font-semibold">Racha Actuelle</p>
                <p className="text-white text-3xl font-bold">🔥 {progress.streak}</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-400/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm font-semibold">Max Racha</p>
                <p className="text-white text-3xl font-bold">⭐ {progress.maxStreak}</p>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">⚙️ Paramètres</h2>

            {/* Settings Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
              {[
                { id: 'display', label: '🎨 Affichage', icon: '🎨' },
                { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
                { id: 'privacy', label: '🔒 Confidentialité', icon: '🔒' },
                { id: 'account', label: '👤 Compte', icon: '👤' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`px-4 py-3 font-semibold transition-all duration-300 border-b-2 ${
                    activeSettingsTab === tab.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Display Settings */}
            {activeSettingsTab === 'display' && (
              <div className="space-y-6">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Mode Sombre</h3>
                    <p className="text-gray-400 text-sm">Activer le thème sombre automatiquement</p>
                  </div>
                  <button
                    onClick={() => updateSetting('darkMode', !settings.darkMode)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.darkMode ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.darkMode ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Animation Settings */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Animations</h3>
                    <p className="text-gray-400 text-sm">Activer les animations et transitions</p>
                  </div>
                  <button className="relative w-14 h-8 rounded-full bg-blue-600">
                    <div className="absolute top-1 w-6 h-6 bg-white rounded-full left-7" />
                  </button>
                </div>

                {/* Compact Mode */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Mode Compact</h3>
                    <p className="text-gray-400 text-sm">Interface condensée pour petits écrans</p>
                  </div>
                  <button className="relative w-14 h-8 rounded-full bg-gray-600">
                    <div className="absolute top-1 w-6 h-6 bg-white rounded-full left-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeSettingsTab === 'notifications' && (
              <div className="space-y-6">
                {/* Enable Notifications */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Notifications In-App</h3>
                    <p className="text-gray-400 text-sm">Recevoir les notifications dans l'application</p>
                  </div>
                  <button
                    onClick={() => updateSetting('notificationsEnabled', !settings.notificationsEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.notificationsEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Notifications */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Son</h3>
                    <p className="text-gray-400 text-sm">Son pour les notifications importantes</p>
                  </div>
                  <button
                    onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.soundEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Daily Reminders */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Rappels Quotidiens</h3>
                    <p className="text-gray-400 text-sm">Rappels d'apprentissage quotidiens</p>
                  </div>
                  <button
                    onClick={() => updateSetting('remindersEnabled', !settings.remindersEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.remindersEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.remindersEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Notifications par Email</h3>
                    <p className="text-gray-400 text-sm">Résumé hebdomadaire de vos progrès</p>
                  </div>
                  <button
                    onClick={() => updateSetting('emailNotifications', !settings.emailNotifications)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.emailNotifications ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeSettingsTab === 'privacy' && (
              <div className="space-y-6">
                {/* Public Profile */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Profil Public</h3>
                    <p className="text-gray-400 text-sm">Permettre aux autres de voir votre profil</p>
                  </div>
                  <button
                    onClick={() => updateSetting('profilePublic', !settings.profilePublic)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                      settings.profilePublic ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${
                        settings.profilePublic ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Hide XP Publicly */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <div>
                    <h3 className="text-white font-semibold">Masquer votre XP publiquement</h3>
                    <p className="text-gray-400 text-sm">Vos statistiques ne seront pas visibles</p>
                  </div>
                  <button className="relative w-14 h-8 rounded-full bg-gray-600">
                    <div className="absolute top-1 w-6 h-6 bg-white rounded-full left-1" />
                  </button>
                </div>

                {/* Delete Data */}
                <button className="w-full p-4 rounded-lg bg-red-900/20 border border-red-500/50 hover:border-red-500 text-red-400 font-semibold transition-all duration-300">
                  🗑️ Supprimer toutes mes données
                </button>
              </div>
            )}

            {/* Account Settings */}
            {activeSettingsTab === 'account' && (
              <div className="space-y-6">
                {/* Change Email */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <h3 className="text-white font-semibold mb-3">Email</h3>
                  <p className="text-gray-400 text-sm mb-3">andrejasimic05@gmail.com</p>
                  <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300">
                    Modifier l'email
                  </button>
                </div>

                {/* Change Password */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <h3 className="text-white font-semibold mb-3">Mot de Passe</h3>
                  <p className="text-gray-400 text-sm mb-3">Dernière modification il y a 3 mois</p>
                  <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300">
                    Changer le mot de passe
                  </button>
                </div>

                {/* Export Progress */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50">
                  <h3 className="text-white font-semibold mb-3">Exporter Mes Données</h3>
                  <p className="text-gray-400 text-sm mb-3">Télécharger vos données de progression en JSON</p>
                  <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-all duration-300">
                    📥 Exporter
                  </button>
                </div>

                {/* Logout */}
                <button className="w-full p-4 rounded-lg bg-slate-700/50 border border-gray-600/50 hover:border-gray-500 text-gray-300 font-semibold transition-all duration-300">
                  🚪 Se déconnecter
                </button>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📈 Progression</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-semibold">Chapitres complétés</span>
                  <span className="text-blue-400 font-bold">{totalChaptersCompleted}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-500"
                    style={{
                      width: `${Math.min((totalChaptersCompleted / 50) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-semibold">Domaines maîtrisés</span>
                  <span className="text-green-400 font-bold">{totalDomainsCompleted}/{educationDomains.length}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500"
                    style={{
                      width: `${(totalDomainsCompleted / educationDomains.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          {progress.badges.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">🏆 Badges Gagnés ({progress.badges.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {progress.badges.map((badgeId) => {
                  const badge = badgeInfo[badgeId];
                  return (
                    <div
                      key={badgeId}
                      className="p-6 rounded-lg bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-400/50 text-center hover:border-purple-400 transition-all duration-300"
                    >
                      <div className="text-5xl mb-3">{badge.emoji}</div>
                      <h3 className="text-white font-bold mb-1">{badge.name}</h3>
                      <p className="text-purple-300 text-sm">{badge.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Domains Progress */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📚 Domaines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {educationDomains.map((domain) => {
                const isCompleted = isDomainCompleted(domain.id);
                const chaptersCompleted = domain.chapters.filter((ch) =>
                  isChapterCompleted(domain.id, ch.id)
                ).length;
                const progressPercent = Math.round((chaptersCompleted / domain.chapters.length) * 100);

                return (
                  <Link
                    key={domain.id}
                    href={`/education/${domain.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 cursor-pointer hover:translate-y-[-4px]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{domain.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold">{domain.name}</h4>
                            <p className="text-gray-400 text-xs">{chaptersCompleted}/{domain.chapters.length} chapitres</p>
                          </div>
                        </div>
                        {isCompleted && <span className="text-2xl">✅</span>}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r h-full transition-all duration-300"
                          style={{
                            background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{progressPercent}% complet</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Certificates Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">🎖️ Certificats</h2>
            {totalDomainsCompleted > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {educationDomains.map((domain) => {
                  const isCompleted = isDomainCompleted(domain.id);
                  if (!isCompleted) return null;

                  const completedDate = progress.completedDomains.find((d) => d.domainId === domain.id)?.date;
                  const formattedDate = completedDate ? new Date(completedDate).toLocaleDateString('fr-FR') : '';

                  return (
                    <div
                      key={domain.id}
                      className="p-6 rounded-xl bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-2 border-amber-400/50 hover:border-amber-400 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-4xl">{domain.icon}</span>
                        <span className="text-2xl">✅</span>
                      </div>
                      <h3 className="text-white font-bold mb-1">Certificat</h3>
                      <p className="text-amber-300 font-semibold mb-3">{domain.name}</p>
                      <p className="text-gray-400 text-sm mb-4">Complété le {formattedDate}</p>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all duration-300">
                          📥 Télécharger
                        </button>
                        <button className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all duration-300">
                          📤 Partager
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400">Complète un domaine pour recevoir un certificat! 🎯</p>
            )}
          </div>

          {/* Learning Calendar */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📅 Activité d'Apprentissage</h2>
            <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-700/50">
              <p className="text-gray-400 mb-4">Jours d'étude ce mois-ci: <span className="text-blue-400 font-bold">{Math.min(progress.completedChapters.length, 30)}/30</span></p>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(42)].map((_, i) => {
                  const isActive = Math.random() > 0.6 || i < progress.completedChapters.length;
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded transition-all duration-300 ${
                        isActive
                          ? 'bg-green-500 hover:ring-2 ring-green-300'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      title={`Jour ${i + 1}`}
                    />
                  );
                })}
              </div>
              <p className="text-gray-400 text-xs mt-4">🟢 = Jour d'étude · 🟫 = Jour sans activité</p>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📊 Statistiques Mensuelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* XP Progress */}
              <div className="p-6 rounded-lg bg-slate-800/50 border border-gray-700/50">
                <h3 className="text-white font-bold mb-4">Progression XP</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">XP ce mois</p>
                    <p className="text-3xl font-bold text-yellow-400">{progress.totalXP}</p>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                      style={{
                        width: `${Math.min((progress.totalXP / 1000) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs">Vers {Math.ceil(progress.totalXP / 500) * 500} XP</p>
                </div>
              </div>

              {/* Quiz Stats */}
              <div className="p-6 rounded-lg bg-slate-800/50 border border-gray-700/50">
                <h3 className="text-white font-bold mb-4">Statistiques Quiz</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Complétés</span>
                    <span className="text-green-400 font-bold">{totalChaptersCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taux de réussite</span>
                    <span className="text-blue-400 font-bold">
                      {totalChaptersCompleted > 0
                        ? Math.round(
                            (progress.completedChapters.reduce((sum, c) => sum + c.score, 0) /
                              (totalChaptersCompleted * 100)) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Meilleur score</span>
                    <span className="text-purple-400 font-bold">
                      {totalChaptersCompleted > 0
                        ? Math.max(...progress.completedChapters.map((c) => c.score))
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Stats */}
              <div className="p-6 rounded-lg bg-slate-800/50 border border-gray-700/50 md:col-span-2">
                <h3 className="text-white font-bold mb-4">Temps d'Apprentissage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Racha actuelle</p>
                    <p className="text-3xl font-bold text-orange-400">🔥 {progress.streak}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Max racha</p>
                    <p className="text-3xl font-bold text-yellow-400">⭐ {progress.maxStreak}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Niveau actuel</p>
                    <p className="text-3xl font-bold text-blue-400">Lvl {progress.userLevel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Themes Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">🎨 Thèmes Disponibles</h2>
            <p className="text-gray-400 mb-6">Débloque de nouveaux thèmes en gagnant de l'XP!</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((theme) => {
                const isUnlocked = progress.totalXP >= theme.xpRequired;
                const isSelected = progress.selectedTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    className={`p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-blue-400 bg-blue-900/20'
                        : isUnlocked
                        ? 'border-gray-600/50 hover:border-gray-500 bg-slate-800/50'
                        : 'border-gray-700 bg-slate-800/20 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (isUnlocked) {
                        setSelectedTheme(theme.id);
                        addNotification(`✨ Thème "${theme.name}" activé!`, 'success', 3000);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{theme.emoji}</span>
                        <div>
                          <h3 className="text-white font-bold">{theme.name}</h3>
                          <p className="text-sm text-gray-400">{theme.description}</p>
                        </div>
                      </div>
                      {isSelected && <span className="text-2xl">✓</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(theme.colors).slice(0, 4).map(([key, color]) => (
                        <div
                          key={key}
                          className="w-6 h-6 rounded border border-gray-600"
                          style={{ backgroundColor: color }}
                          title={key}
                        />
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      {isUnlocked ? (
                        <p className="text-green-400 text-sm font-semibold">✓ Débloqué</p>
                      ) : (
                        <p className="text-orange-400 text-sm font-semibold">
                          Besoin de {theme.xpRequired - progress.totalXP} XP
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">🤝 Partager mon Profil</h2>
            <p className="text-gray-400 mb-6">Invite tes amis à rejoindre InvestKit et à progresser ensemble!</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={copyProfileLink}
                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex-1"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                📋 Copier le lien
              </button>
              <button
                onClick={shareProfile}
                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex-1"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #c084fc)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                𝕏 Partager sur Twitter
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
