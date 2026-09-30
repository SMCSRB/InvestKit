import { redirect } from 'next/navigation';

// Le support passe par la page Contact.
export default function SupportPage() {
  redirect('/contact');
}
