import Coin from '@/app/components/ui/Coin';

// Texte du guide : « [[coin]] » devient l'icône de pièce (jamais le symbole de l'euro pour un montant de jeu).
export default function GuideText({ children }) {
  const parts = String(children).split('[[coin]]');
  return parts.flatMap((p, i) => (i === 0 ? [p] : [<Coin key={i} />, p]));
}
