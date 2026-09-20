'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import { useEducationProgress } from '@/app/context/EducationContext';
import Link from 'next/link';

export default function FriendsPage() {
  const { user, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, cancelFriendRequest, blockUser, unblockUser } = useUser();
  const { progress } = useEducationProgress();
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, add, blocked
  const [searchInput, setSearchInput] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback pour HTTP
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
  const [mockUsers] = useState([
    { friendCode: '#ABC123', name: 'Alice Dupont', level: 5, xp: 2500 },
    { friendCode: '#XYZ789', name: 'Bob Martin', level: 8, xp: 4200 },
    { friendCode: '#DEF456', name: 'Clara Rousseau', level: 3, xp: 1500 },
    { friendCode: '#GHI321', name: 'David Lemoine', level: 6, xp: 3100 },
    { friendCode: '#JKL654', name: 'Emma Leclerc', level: 9, xp: 5000 },
  ]);

  const handleAddFriend = (friendCode, friendName) => {
    sendFriendRequest(friendCode, friendName);
  };

  const searchResults = mockUsers.filter(
    (u) =>
      u.friendCode.toLowerCase().includes(searchInput.toLowerCase()) ||
      u.name.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Classer les amis par XP
  const sortedFriends = [...user.friends].sort((a, b) => {
    const aUser = mockUsers.find((u) => u.friendCode === a.friendCode);
    const bUser = mockUsers.find((u) => u.friendCode === b.friendCode);
    return (bUser?.xp || 0) - (aUser?.xp || 0);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">👥 Mes Amis</h1>
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 px-4 py-2 rounded-lg border border-blue-500/50">
              <p className="text-blue-300 font-mono font-bold text-lg">{user.friendCode}</p>
              <p className="text-blue-200 text-sm">Ton code d'ami unique</p>
            </div>
            <button
              onClick={() => copyToClipboard(user.friendCode)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
            >
              {copied ? '✓ Copié!' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'friends', label: '👫 Amis', count: user.friends.length },
            { id: 'requests', label: '📩 Demandes', count: user.friendRequests.received.length },
            { id: 'add', label: '➕ Ajouter', count: null },
            { id: 'blocked', label: '🚫 Bloqués', count: user.blockedUsers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {sortedFriends.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-lg">Aucun ami pour le moment</p>
                  <p className="text-sm mt-2">Clique sur "Ajouter" pour chercher des amis !</p>
                </div>
              ) : (
                sortedFriends.map((friend, idx) => {
                  const friendUser = mockUsers.find((u) => u.friendCode === friend.friendCode);
                  const myXP = progress.totalXP || 0;
                  const xpDiff = (friendUser?.xp || 0) - myXP;

                  return (
                    <div
                      key={friend.userId}
                      className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 hover:bg-slate-700/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                              #{idx + 1}
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg">{friendUser?.name}</h3>
                              <p className="text-slate-400 text-sm font-mono">{friend.friendCode}</p>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-4 text-sm ml-15">
                            <div>
                              <p className="text-slate-400">Niveau</p>
                              <p className="text-blue-300 font-bold">{Math.floor((friendUser?.xp || 0) / 500) + 1}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">XP</p>
                              <p className={`font-bold ${xpDiff > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                {friendUser?.xp}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Différence</p>
                              <p className={`font-bold ${xpDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {xpDiff > 0 ? '+' : ''}{xpDiff}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link
                            href={`/profile?friend=${friend.friendCode}`}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition text-sm"
                          >
                            Voir Profil
                          </Link>
                          <button
                            onClick={() => removeFriend(friend.friendCode)}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-4 py-2 rounded-lg transition text-sm border border-red-500/50"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span>📬 Demandes reçues</span>
                  {user.friendRequests.received.length > 0 && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                      {user.friendRequests.received.length}
                    </span>
                  )}
                </h3>
                {user.friendRequests.received.length === 0 ? (
                  <p className="text-slate-400 text-sm">Aucune demande en attente</p>
                ) : (
                  user.friendRequests.received.map((req) => (
                    <div
                      key={req.userId}
                      className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-bold">{req.name}</p>
                        <p className="text-slate-400 text-sm font-mono">{req.friendCode}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptFriendRequest(req.friendCode, req.name)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition text-sm"
                        >
                          ✓ Accepter
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(req.friendCode)}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-4 py-2 rounded-lg transition text-sm border border-red-500/50"
                        >
                          ✕ Refuser
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <h3 className="text-white font-bold mb-3 mt-6">📤 Demandes envoyées</h3>
                {user.friendRequests.sent.length === 0 ? (
                  <p className="text-slate-400 text-sm">Aucune demande en attente</p>
                ) : (
                  user.friendRequests.sent.map((req) => (
                    <div
                      key={req.userId}
                      className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-bold">{req.name}</p>
                        <p className="text-slate-400 text-sm font-mono">{req.friendCode}</p>
                      </div>
                      <button
                        onClick={() => cancelFriendRequest(req.friendCode)}
                        className="bg-slate-600 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Add Friends Tab */}
          {activeTab === 'add' && (
            <div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Cherche par #ID ou nom (ex: #ABC123 ou Alice)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {searchInput.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Rentre un #ID ou un nom pour chercher des amis</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((foundUser) => {
                    const isFriend = user.friends.some((f) => f.friendCode === foundUser.friendCode);
                    const hasSentRequest = user.friendRequests.sent.some(
                      (req) => req.friendCode === foundUser.friendCode
                    );
                    const hasReceivedRequest = user.friendRequests.received.some(
                      (req) => req.friendCode === foundUser.friendCode
                    );

                    return (
                      <div
                        key={foundUser.friendCode}
                        className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-bold">{foundUser.name}</p>
                          <p className="text-slate-400 text-sm font-mono">{foundUser.friendCode}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Niveau {Math.floor(foundUser.xp / 500) + 1} • {foundUser.xp} XP
                          </p>
                        </div>
                        {isFriend ? (
                          <span className="text-green-400 font-bold">✓ Ami</span>
                        ) : hasSentRequest ? (
                          <span className="text-orange-400 font-bold">⏳ Demande envoyée</span>
                        ) : hasReceivedRequest ? (
                          <span className="text-blue-400 font-bold">📬 À accepter</span>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(foundUser.friendCode, foundUser.name)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition font-semibold"
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

          {/* Blocked Users Tab */}
          {activeTab === 'blocked' && (
            <div>
              {user.blockedUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Aucun utilisateur bloqué</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.blockedUsers.map((blocked) => (
                    <div
                      key={blocked.userId}
                      className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-bold">{blocked.name}</p>
                        <p className="text-slate-400 text-sm font-mono">{blocked.friendCode}</p>
                      </div>
                      <button
                        onClick={() => unblockUser(blocked.friendCode)}
                        className="bg-slate-600 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition text-sm"
                      >
                        Débloquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
