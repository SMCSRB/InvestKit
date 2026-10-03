# Profil : photo, nom, bio, e-mail

## Cause du bug « photo visible seulement après rechargement »
Dans Paramètres > Profil, l'envoi de photo écrivait l'image dans `localStorage` du navigateur sans prévenir le reste de la page : l'en-tête (qui lisait la photo une seule fois au chargement) gardait la lettre initiale. La photo n'était **jamais envoyée au serveur** : aucun autre joueur ne pouvait la voir. De la même façon, le nom, l'e-mail et la bio de cette page étaient des valeurs locales : l'e-mail commençait à « jean.dupont@example.com » et la bio à un texte d'exemple, et un clic sur « Enregistrer » les écrivait dans le navigateur (sans toucher au vrai compte, mais en les faisant passer pour les vraies données).

## Maintenant
- **Serveur seul référence** : `GET/PATCH /api/v1/profile`. Un champ absent n'est pas touché ; un champ vide reste vide ; l'e-mail est ignoré par cette route ; chaque champ est validé et nettoyé (longueur, caractères, balises et caractères de contrôle retirés).
- **Photo** : `POST/DELETE /api/v1/profile/avatar`. Le vrai format est lu dans les octets (JPEG, PNG, WebP), 3 Mo maximum reçus, image pivotée, recadrée en 256 x 256, recompressée en WebP, **toutes les métadonnées retirées** (EXIF, GPS), protection contre les images « bombes ». L'identifiant public de l'image est aléatoire (36 caractères) et change à chaque envoi ou suppression ; il n'est donné que dans les réponses qui montrent déjà ce joueur (compte, amis, classements, guilde ; joueurs bloqués : jamais). Stockage dans la table `user_avatars` (PostgreSQL), pas sur le disque. Limitation : 10 envois par heure.
- **Partout, tout de suite** : après chaque enregistrement, le navigateur envoie l'évènement `ik-user-changed` ; l'en-tête et le menu rechargent le compte. La lettre initiale reste le secours (pas de photo ou image qui ne charge pas).
- **E-mail** : procédure à part (`/profile/email/request` puis `/confirm`) : mot de passe (+ code 2FA), code à 6 chiffres envoyé à la NOUVELLE adresse (haché en base, 15 minutes, 5 essais), l'ancienne adresse est prévenue à la demande et au changement, réponse identique que l'adresse soit déjà prise ou non, limites de débit (6 par heure et par IP, 3 envois par heure vers une même adresse).
- Nom complet : stocké dans `first_name` / `last_name` ; les valeurs de remplissage « Unknown » / « User » de l'inscription ne sont jamais affichées comme un nom.

## À savoir
Nouvelle dépendance serveur : `sharp` 0.35.5 (Apache-2.0), version fixée, déjà présente côté site via Next.js.
