'use client';

import ProMark from '@/app/components/plan/ProMark';

// Nom d'un joueur partout où il apparaît : pseudo, #tag discret et petite couronne Pro (si le serveur l'indique).
export default function PlayerName({ name, tag, pro, isMe, showTag = true, className = '' }) {
  return (
    <span className={`ik-pname ${className}`}>
      <span className="ik-pname__n">{name}</span>
      {showTag && tag ? <span className="ik-pname__t">#{tag}</span> : null}
      {pro ? <ProMark /> : null}
      {isMe ? <span className="ik-pname__me"> (toi)</span> : null}
    </span>
  );
}
