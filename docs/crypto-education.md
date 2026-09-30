# Crypto — glossaire, quiz liés et icônes « ? »

> Simulation à but éducatif, pas un conseil en investissement.

- **Glossaire** : 36 nouvelles entrées « Crypto : le marché simulé » rédigées pour ce projet (blockchain, portefeuille, clé privée, frais de réseau, stablecoin, décrochage, capitalisation, volume, liquidité, paliers, écart achat/vente, glissement, ordres marché/limite/stop-loss/take-profit, levier, LTV, liquidation, risque de plateforme, rug pull, DeFi, preuve de travail/d'enjeu, halving, fork, corrélation, bougie, échelle logarithmique, base 100, moyennes mobiles, Bollinger, RSI, MACD, échange crypto/crypto, ICO…). Les taux/seuils fiscaux y sont toujours présentés « à vérifier sur service-public.fr ».
- **Parcours « Crypto : le marché simulé »** (`/education/crypto_market`) : 5 chapitres (lire un marché, risques, ordres, levier/appel de marge/liquidation, lire un graphique), chacun avec « mots à retenir » reliés au glossaire et un quiz de 5 questions, plus un quiz final de 8 questions. Chaque entrée du glossaire crypto renvoie vers le chapitre de quiz correspondant (📝 « Teste-toi »), y compris depuis la bulle « ? ».
- **Icônes « ? »** (composant `HelpTip` réutilisé) dans le marché (volume, capitalisation, palier de liquidité, plus haut historique, risque), le ticket d'ordre (écart, glissement, types d'ordres), le portefeuille/échange, la Banque (LTV, appel de marge, liquidation), le classement (levier) et le graphique (échelle log, moyennes, Bollinger, RSI, MACD).
- **Correctif lié** : la page d'un chapitre du parcours n'affichait qu'un texte provisoire ; elle affiche maintenant la leçon, les mots à retenir et un quiz jouable (la première réussite d'un chapitre rapporte les 🪙 prévus par le module Éducation existant). Le quiz final redirigeait à tort vers la connexion (clé `authToken` jamais posée) : corrigé.
- **Tests** : `backend/tests/cryptoEducation.test.ts` vérifie les identifiants uniques, que chaque « ? » pointe vers un terme existant, que chaque quiz est bien formé et que les liens glossaire ↔ chapitres existent.

## À tester chez moi
- [ ] Glossaire → catégorie « Crypto : le marché simulé » ; « Teste-toi » ouvre le bon chapitre.
- [ ] `/education/crypto_market/3` : lire, répondre au quiz (un échec puis une réussite) ; les pièces du chapitre sont créditées une seule fois.
- [ ] Sur `/crypto`, cliquer un « ? » (ex. glissement) : explication + lien « Teste-toi ».
