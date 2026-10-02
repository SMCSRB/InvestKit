import { redirect } from 'next/navigation';

// L'ancienne page de guilde affichait des données d'exemple : les guildes réelles vivent dans /friends?tab=guild.
export default function GuildRedirect() {
  redirect('/friends?tab=guild');
}
