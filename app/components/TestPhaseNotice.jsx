import Icon from '@/app/components/ui/Icon';

// Bandeau commun aux pages légales : le site est en phase de test.
export default function TestPhaseNotice() {
  return (
    <div className="ik-notice ik-notice--warning" role="note">
      <Icon name="alert" size={20} />
      <p>
        <strong>Site en phase de test.</strong> InvestKit est actuellement réservé à un cercle
        restreint de testeurs invités. Les InvestCoins sont une monnaie virtuelle sans valeur réelle
        et les simulations sont pédagogiques. Les informations ci-dessous seront complétées et
        relues avant toute ouverture au public.
      </p>
    </div>
  );
}
