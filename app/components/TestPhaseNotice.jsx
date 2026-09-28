// Bandeau commun aux pages légales : le site est en phase de test.
export default function TestPhaseNotice() {
  return (
    <div style={{
      background: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.5)',
      borderRadius: '12px',
      padding: '14px 18px',
      margin: '0 0 28px 0',
      color: '#92400e',
      fontSize: '13px',
      lineHeight: '1.6',
    }}>
      <strong>Site en phase de test.</strong> InvestKit est actuellement réservé à un cercle
      restreint de testeurs invités. Les InvestCoins sont une monnaie virtuelle sans valeur réelle
      et les simulations sont pédagogiques. Les informations ci-dessous seront complétées et
      relues avant toute ouverture au public.
    </div>
  );
}
