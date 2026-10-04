import { redirect } from 'next/navigation';

// L'ancienne page de lecture a disparu : le guide est maintenant interactif. Les vieux liens mènent à « Aide et support ».
export default function GuidePage() {
  redirect('/support');
}
