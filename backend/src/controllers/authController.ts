import { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateToken, generatePending2FAToken, verifyToken } from '../utils/jwt';
import { setSessionCookies, clearSessionCookies, tokenInBody, readCookie, ADMIN_BACKUP_COOKIE } from '../utils/session';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';
import { env } from '../config/env';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { verifyCaptcha } from '../utils/captcha';
import { notify } from '../services/notificationService';
import { query } from '../utils/db';
import { checkLock, recordFailure, recordSuccess } from '../services/loginThrottle';
import { checkPassword } from '../utils/passwordPolicy';
import { LOGIN_THROTTLE } from '../config/securityRules';
import { activateAccount } from '../services/verificationService';
import { DOMAINS } from '../data/marketData';
import { hasProAccess } from '../utils/entitlements';
import { generateUniqueReferralCode } from '../utils/referral';
import { invitationRepository, normalizeInvitationCode } from '../repositories/invitationRepository';
import { getClient } from '../utils/db';
import {
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCodes,
  consumeBackupCode,
} from '../utils/totp';
import { generateVerificationCode } from '../utils/verificationCode';
import { decryptField } from '../utils/fieldCrypto';
import { auditLog } from '../services/auditService';

// Domaines pouvant être choisis comme domaine gratuit. L'interface garde
// Immobilier grisé tant que ses écrans (étape 7) n'existent pas, pour ne pas
// faire gaspiller au joueur son choix unique ; l'API, elle, est prête.
const VALID_FREE_DOMAINS = [...Object.keys(DOMAINS), 'real_estate', 'crypto_market'];

// Faux hash bcrypt (coût 10) pour égaliser le temps de réponse quand le compte n'existe pas.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

export const authController = {
  register: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, captchaToken, referralCode, inviteCode } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const passwordError = checkPassword(password, email);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }

      if (!captchaToken) {
        res.status(400).json({ error: 'Le captcha est requis' });
        return;
      }
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        res.status(400).json({ error: 'Captcha invalide ou expiré' });
        return;
      }

      // Inscription sur invitation : le code est vérifié ici (format), puis
      // consommé de façon atomique avec la création du compte plus bas.
      const normalizedInvite = normalizeInvitationCode(inviteCode);
      if (env.inviteOnly && !normalizedInvite) {
        res.status(403).json({ error: 'Un code d\'invitation valide est requis pour s\'inscrire' });
        return;
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'Cet email est déjà utilisé' });
        return;
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Générer un code de vérification à 6 chiffres
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Programme de parrainage : chaque compte reçoit son propre code à
      // partager, et peut avoir été parrainé par le code d'un autre.
      const newReferralCode = await generateUniqueReferralCode();
      let referredByUserId: string | undefined;
      if (referralCode) {
        const referrer = await userRepository.findByReferralCode(referralCode);
        if (referrer) referredByUserId = referrer.id;
      }

      // Créer l'utilisateur en BD. Avec un code d'invitation, la consommation
      // du code et la création du compte sont UNE transaction : si le compte
      // n'est pas créé, le code n'est pas brûlé ; et un code à usage unique
      // ne peut servir qu'à un seul compte.
      let newUser;
      const client = await getClient();
      try {
        await client.query('BEGIN');
        let invitationId: string | null = null;
        if (normalizedInvite) {
          invitationId = await invitationRepository.consume(normalizedInvite, client);
          if (!invitationId && env.inviteOnly) {
            await client.query('ROLLBACK');
            res.status(403).json({ error: 'Code d\'invitation invalide, expiré ou épuisé' });
            return;
          }
        }
        newUser = await userRepository.create({
          email,
          password_hash: hashedPassword,
          first_name: 'Unknown',
          last_name: 'Unknown',
          verification_code: verificationCode,
          verification_code_expires_at: verificationCodeExpiresAt,
          referral_code: newReferralCode,
          referred_by_user_id: referredByUserId,
          invitation_code_id: invitationId,
        }, client);
        await client.query('COMMIT');
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

      // Envoyer email de vérification
      try {
        await sendVerificationEmail(email, 'User', verificationCode);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Continue anyway, user can still request resend
      }

      res.status(201).json({
        success: true,
        message: 'Inscription réussie. Vérifiez votre email.',
        userId: newUser.id,
        verificationCode: env.isDev ? verificationCode : undefined, // Afficher le code en dev uniquement
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  },

  // Le site est-il en inscription sur invitation ? (pour afficher le champ code)
  getSignupConfig: async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ inviteOnly: env.inviteOnly });
  },

  verifyEmail: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      if (user.verification_code !== code) {
        res.status(400).json({ error: 'Code de vérification invalide' });
        return;
      }

      // Vérifier si le code a expiré
      if (user.verification_code_expires_at && new Date() > user.verification_code_expires_at) {
        res.status(400).json({ error: 'Code expiré' });
        return;
      }

      // Activation + récompenses atomiques : un double envoi du code ne
      // verse les InvestCoins qu'une fois.
      const activated = await activateAccount(user, code);
      if (!activated) {
        res.status(400).json({ error: 'Code de vérification invalide ou déjà utilisé' });
        return;
      }

      res.json({
        success: true,
        message: 'Email vérifié avec succès',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
        },
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  },

  resendCode: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email requis' });
        return;
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      if (user.verified) {
        res.status(400).json({ error: 'Cet utilisateur est déjà vérifié' });
        return;
      }

      // Générer un nouveau code
      const newCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await userRepository.updateVerificationCode(user.id, newCode, expiresAt);

      // Envoyer email
      try {
        await sendVerificationEmail(email, user.first_name, newCode);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      res.json({
        success: true,
        message: 'Code renvoyé avec succès',
        verificationCode: env.isDev ? newCode : undefined,
      });
    } catch (error) {
      console.error('Resend code error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
    }
  },

  savePreferences: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, username, accountType, interests, language } = req.body;

      if (!email || !username || !accountType) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      // Sauvegarder les préférences et le username
      // NB: la 2FA ne se règle plus ici - impossible de l'activer sans
      // avoir prouvé la possession d'un secret TOTP (voir /auth/2fa/*).
      await userRepository.updatePreferences(user.id, {
        username: username.trim(),
        account_type: accountType,
        interests: JSON.stringify(interests || []),
        language: language || 'fr',
      });

      // Générer un token JWT
      const token = generateToken(user.id, user.email);
      setSessionCookies(res, token);

      res.json({
        success: true,
        message: 'Préférences sauvegardées',
        ...(tokenInBody() ? { token } : {}),
        user: {
          id: user.id,
          email: user.email,
          username: username.trim(),
          accountType,
        },
      });
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Ce pseudo est déjà pris' });
        return;
      }
      console.error('Save preferences error:', error);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
  },

  login: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email et mot de passe requis' });
        return;
      }

      // Verrouillage temporaire par compte (même réponse pour un e-mail inconnu : aucun compte n'est révélé).
      const lock = await checkLock(String(email));
      if (lock.locked) {
        res.setHeader('Retry-After', String(lock.retryAfterSeconds));
        res.status(429).json({ error: `Trop d'échecs de connexion : compte temporairement verrouillé. Réessayez dans ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).`, code: 'LOGIN_LOCKED' });
        return;
      }

      const user = await userRepository.findByEmail(email);
      // Comparaison bcrypt TOUJOURS effectuée (contre un faux hash si le compte n'existe pas) : le temps de réponse ne révèle pas l'existence du compte.
      const passwordMatch = await bcrypt.compare(String(password), user?.password_hash ?? DUMMY_HASH);
      if (!user || !passwordMatch) {
        const justLocked = await recordFailure(String(email));
        if (user) {
          await auditLog({ userId: user.id, action: justLocked ? 'login_locked' : 'login_failed', entityType: 'user', entityId: user.id, metadata: { reason: 'bad_credentials' }, ip: req.ip });
        }
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        return;
      }
      await recordSuccess(String(email));

      if ((user as any).disabled_at) {
        res.status(403).json({ error: 'Ce compte est suspendu. Contactez le support.', code: 'ACCOUNT_DISABLED' });
        return;
      }

      if (!user.verified) {
        res.status(403).json({ error: 'Veuillez vérifier votre email d\'abord' });
        return;
      }

      // Compte protégé par 2FA : mot de passe correct mais pas de session
      // complète tant que le code TOTP n'est pas vérifié (voir /2fa/login-verify)
      if (user.enable_2fa) {
        const tempToken = generatePending2FAToken(user.id, user.email);
        res.json({ success: true, requires2FA: true, tempToken });
        return;
      }

      // Mettre à jour last_login_at
      await userRepository.updateLastLogin(user.id);
      await auditLog({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, metadata: { twoFactor: false }, ip: req.ip });

      const token = generateToken(user.id, user.email);
      setSessionCookies(res, token);

      res.json({
        success: true,
        message: 'Connexion réussie',
        ...(tokenInBody() ? { token } : {}),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  },

  forgotPassword: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email requis' });
        return;
      }

      // Réponse IDENTIQUE que le compte existe ou non (aucune énumération de comptes).
      const uniform = { success: true, message: 'Si cet email correspond à un compte, un lien de réinitialisation vient d\'être envoyé.' };
      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.json(uniform);
        return;
      }

      // Jeton aléatoire de 256 bits, valable 1 heure, à usage unique ; seule son empreinte est stockée.
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
      await userRepository.updateResetToken(user.id, resetToken, expiresAt);
      await auditLog({ userId: user.id, action: 'password_reset_requested', entityType: 'user', entityId: user.id, ip: req.ip });

      const link = `${env.frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, link);

      // Jamais en production : uniquement pour les tests automatisés (variable explicite).
      res.json(process.env.EXPOSE_RESET_TOKEN_FOR_TESTS === 'true' ? { ...uniform, resetToken } : uniform);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Erreur lors de la demande' });
    }
  },

  resetPassword: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const user = await userRepository.findByResetToken(resetToken);
      if (!user) {
        res.status(400).json({ error: 'Token invalide ou expiré' });
        return;
      }

      const pwError = checkPassword(newPassword, user.email);
      if (pwError) {
        res.status(400).json({ error: pwError });
        return;
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await userRepository.updatePassword(user.id, hashedPassword);
      await recordSuccess(user.email); // un verrouillage en cours n'a plus lieu d'être après une réinitialisation
      await auditLog({ userId: user.id, action: 'password_reset', entityType: 'user', entityId: user.id, ip: req.ip });
      await notify({ query }, user.id, { kind: 'security_password_changed', title: 'Mot de passe modifié', body: 'Ton mot de passe vient d\'être changé. Si ce n\'est pas toi, réinitialise-le tout de suite et contacte le support.' });

      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
  },

  getCurrentUser: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          subscriptionTier: user.subscription_tier,
          freeDomain: user.free_domain,
          hasProAccess: hasProAccess(user),
          isAdmin: user.role === 'admin',
          canChangeFreeDomain: !!user.free_domain && user.free_domain_change_allowed === true,
          enable2FA: user.enable_2fa,
          referralCode: user.referral_code,
        },
        impersonatedBy: req.impersonatedBy ?? null,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  },

  // Choix du domaine débloqué gratuitement (tier free) - laissé à
  // l'utilisateur, pas de domaine imposé par défaut. Choix UNIQUE et
  // définitif (sinon l'abonnement Pro serait contournable).
  setFreeDomain: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { domain } = req.body;
      if (!domain || typeof domain !== 'string') {
        res.status(400).json({ error: 'Domaine requis' });
        return;
      }

      if (!VALID_FREE_DOMAINS.includes(domain)) {
        res.status(400).json({ error: 'Domaine inconnu' });
        return;
      }

      // 1er choix, sinon l'unique changement accordé aux comptes existants.
      const saved =
        (await userRepository.setFreeDomainOnce(req.user.userId, domain)) ||
        (await userRepository.changeFreeDomainOnce(req.user.userId, domain));
      if (!saved) {
        res.status(409).json({ error: 'Domaine gratuit déjà choisi (non modifiable)' });
        return;
      }
      res.json({ success: true, freeDomain: domain });
    } catch (error) {
      console.error('Set free domain error:', error);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde du domaine' });
    }
  },

  checkEmail: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({ error: 'Email requis' });
        return;
      }

      const user = await userRepository.findByEmail(email);

      res.json({
        available: !user,
        exists: !!user,
      });
    } catch (error) {
      console.error('Check email error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  },

  // ============ 2FA (TOTP) ============

  // Étape 1 : génère un secret + QR code. La 2FA n'est PAS encore active -
  // il faut confirmer avec un code valide via verifyTwoFactorSetup.
  setupTwoFactor: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      if (user.enable_2fa) {
        res.status(400).json({ error: 'La 2FA est déjà activée sur ce compte' });
        return;
      }

      const secret = generateTotpSecret();
      await userRepository.setPendingTotpSecret(user.id, secret);
      const qrCode = await generateQrCodeDataUrl(user.email, secret);

      res.json({ qrCode, secret });
    } catch (error) {
      console.error('Setup 2FA error:', error);
      res.status(500).json({ error: 'Erreur lors de la configuration de la 2FA' });
    }
  },

  // Étape 2 : confirme le code scanné, active réellement la 2FA et renvoie
  // les codes de secours en clair (une seule fois - à noter précieusement).
  verifyTwoFactorSetup: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { code } = req.body;
      const user = await userRepository.findById(req.user.userId);
      if (!user?.totp_secret) {
        res.status(400).json({ error: 'Aucune configuration 2FA en attente' });
        return;
      }

      if (!code || !verifyTotpCode(code, decryptField(user.totp_secret))) {
        res.status(400).json({ error: 'Code invalide' });
        return;
      }

      const backupCodes = generateBackupCodes();
      const hashed = await hashBackupCodes(backupCodes);
      await userRepository.enableTwoFactor(user.id, hashed);
      await auditLog({ userId: user.id, action: '2fa_enabled', entityType: 'user', entityId: user.id, ip: req.ip });
      await notify({ query }, user.id, { kind: 'security_2fa_enabled', title: 'Double authentification activée', body: 'Ton compte est désormais protégé par un code à chaque connexion.' });

      res.json({ success: true, backupCodes });
    } catch (error) {
      console.error('Verify 2FA setup error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  },

  // Désactive la 2FA - nécessite le mot de passe pour éviter qu'une session
  // volée suffise à désactiver la protection.
  disableTwoFactor: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { password } = req.body;
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      const passwordMatch = typeof password === 'string' && password.length > 0 && (await bcrypt.compare(password, user.password_hash));
      if (!passwordMatch) {
        res.status(401).json({ error: 'Mot de passe incorrect' });
        return;
      }

      await userRepository.disableTwoFactor(user.id);
      await auditLog({ userId: user.id, action: '2fa_disabled', entityType: 'user', entityId: user.id, ip: req.ip });
      await notify({ query }, user.id, { kind: 'security_2fa_disabled', title: 'Double authentification désactivée', body: 'Si ce n\'est pas toi, change ton mot de passe immédiatement.' });
      res.json({ success: true });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({ error: 'Erreur lors de la désactivation' });
    }
  },

  // Complète une connexion mise en attente par login() quand enable_2fa=true.
  // Accepte soit un code TOTP à 6 chiffres, soit un code de secours à usage unique.
  verifyLoginTwoFactor: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { tempToken, code } = req.body;
      if (!tempToken || !code) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const payload = verifyToken(tempToken);
      if (!payload || !payload.pending2fa) {
        res.status(401).json({ error: 'Session de connexion expirée, reconnectez-vous' });
        return;
      }

      const user = await userRepository.findById(payload.userId);
      if (!user || !user.enable_2fa || !user.totp_secret) {
        res.status(401).json({ error: 'Configuration 2FA invalide' });
        return;
      }

      const twoFaKey = `2fa:${user.id}`;
      const lock2fa = await checkLock(twoFaKey);
      if (lock2fa.locked) {
        res.setHeader('Retry-After', String(lock2fa.retryAfterSeconds));
        res.status(429).json({ error: `Trop de codes erronés : réessayez dans ${Math.ceil(lock2fa.retryAfterSeconds / 60)} minute(s).`, code: 'LOGIN_LOCKED' });
        return;
      }

      let valid = verifyTotpCode(code, decryptField(user.totp_secret));

      if (!valid && user.totp_backup_codes?.length) {
        const remaining = await consumeBackupCode(code, user.totp_backup_codes);
        if (remaining) {
          valid = true;
          await userRepository.updateBackupCodes(user.id, remaining);
        }
      }

      if (!valid) {
        const justLocked = await recordFailure(twoFaKey, LOGIN_THROTTLE.totpMaxFailures);
        await auditLog({ userId: user.id, action: justLocked ? 'login_locked' : 'login_failed', entityType: 'user', entityId: user.id, metadata: { reason: 'bad_2fa_code' }, ip: req.ip });
        res.status(401).json({ error: 'Code invalide' });
        return;
      }
      await recordSuccess(twoFaKey);
      if ((user as any).disabled_at) {
        res.status(403).json({ error: 'Ce compte est suspendu. Contactez le support.', code: 'ACCOUNT_DISABLED' });
        return;
      }

      await userRepository.updateLastLogin(user.id);
      await auditLog({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, metadata: { twoFactor: true }, ip: req.ip });
      const token = generateToken(user.id, user.email);
      setSessionCookies(res, token);

      res.json({
        success: true,
        message: 'Connexion réussie',
        ...(tokenInBody() ? { token } : {}),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Verify login 2FA error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  },
  // Déconnexion : efface les cookies de session (le jeton lui-même reste valide jusqu'à son expiration, comme tout JWT sans liste de révocation).
  logout: async (_req: AuthRequest, res: Response): Promise<void> => {
    clearSessionCookies(res);
    res.json({ success: true });
  },

  // Sortie de l'impersonation : rétablit la session de l'administrateur mise de côté (cookie httpOnly), après avoir revérifié qu'il est toujours admin.
  stopImpersonation: async (req: AuthRequest, res: Response): Promise<void> => {
    const backup = readCookie(req, ADMIN_BACKUP_COOKIE);
    const payload = backup ? verifyToken(backup) : null;
    if (!req.user?.impersonatedBy || !payload || payload.impersonatedBy || payload.pending2fa || payload.userId !== req.user.impersonatedBy) {
      res.status(400).json({ error: 'Aucune impersonation en cours' });
      return;
    }
    const admin = await userRepository.findById(payload.userId);
    if (!admin || admin.role !== 'admin') {
      clearSessionCookies(res);
      res.status(403).json({ error: 'Session administrateur invalide' });
      return;
    }
    setSessionCookies(res, backup!);
    res.clearCookie(ADMIN_BACKUP_COOKIE, { path: '/' });
    await auditLog({ userId: admin.id, action: 'admin_impersonate_stop', entityType: 'user', entityId: req.user.userId, ip: req.ip });
    res.json({ success: true });
  },

  // Migration des sessions : un navigateur qui détient encore un ancien jeton (localStorage) l'échange contre un cookie httpOnly.
  // Appelé avec l'en-tête Bearer ; renvoie 200 et pose les cookies avec un jeton neuf de même identité.
  upgradeSession: async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    setSessionCookies(res, generateToken(req.user.userId, req.user.email));
    res.json({ success: true });
  },
};
