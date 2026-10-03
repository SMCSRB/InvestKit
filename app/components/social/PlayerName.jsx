'use client';

import ProMark from '@/app/components/plan/ProMark';
import Avatar from '@/app/components/social/Avatar';

// Nom d'un joueur partout où il apparaît : pseudo, #tag discret et petite couronne Pro (si le serveur l'indique).
export default function PlayerName({ name, tag, pro, isMe, avatarId, showAvatar = true, showTag = true, className = '' }) {
  return (
    <span className={`ik-pname ${className}`}>
      {showAvatar && avatarId !== undefined ? <Avatar avatarId={avatarId} name={name} size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} /> : null}
      <span className="ik-pname__n">{name}</span>
      {showTag && tag ? <span className="ik-pname__t">#{tag}</span> : null}
      {pro ? <ProMark /> : null}
      {isMe ? <span className="ik-pname__me"> (toi)</span> : null}
    </span>
  );
}
