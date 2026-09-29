import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, generatePending2FAToken, verifyToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';
import { env } from '../config/env';
import { sendVerificationEmail } from '../utils/email';
import { verifyCaptcha } from '../utils/captcha';
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

// Domaines pouvant être choisis comme domaine gratuit. L'interface garde
// Immobilier grisé tant que ses écrans (étape 7) n'existent pas, pour ne pas
// faire gaspiller au joueur son choix unique ; l'API, elle, est prête.
const VALID_FREE_DOMAINS = [...Object.keys(DOMAINS), 'real_estate'];

export const authController = {
  register: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, captchaToken, referralCode, inviteCode } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ error: 'Données manquantes' });
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
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
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
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
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

      res.json({
        success: true,
        message: 'Préférences sauvegardées',
        token,
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

      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
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

      const token = generateToken(user.id, user.email);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
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

      const user = await userRepository.findByEmail(email);
      if (!user) {
        // Pour des raisons de sécurité, ne pas révéler si l'email existe
        res.json({
          success: true,
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        });
        return;
      }

      // Générer un token de réinitialisation
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

      await userRepository.updateResetToken(user.id, resetToken, expiresAt);

      // TODO: Envoyer email avec lien de réinitialisation

      res.json({
        success: true,
        message: 'Lien de réinitialisation envoyé à votre email',
        resetToken: env.isDev ? resetToken : undefined, // Afficher en dev uniquement
      });
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

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await userRepository.updatePassword(user.id, hashedPassword);

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
          canChangeFreeDomain: !!user.free_domain && user.free_domain_change_allowed === true,
          enable2FA: user.enable_2fa,
          referralCode: user.referral_code,
        },
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

      if (!code || !verifyTotpCode(code, user.totp_secret)) {
        res.status(400).json({ error: 'Code invalide' });
        return;
      }

      const backupCodes = generateBackupCodes();
      const hashed = await hashBackupCodes(backupCodes);
      await userRepository.enableTwoFactor(user.id, hashed);

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

      const passwordMatch = password && (await bcrypt.compare(password, user.password_hash));
      if (!passwordMatch) {
        res.status(401).json({ error: 'Mot de passe incorrect' });
        return;
      }

      await userRepository.disableTwoFactor(user.id);
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

      let valid = verifyTotpCode(code, user.totp_secret);

      if (!valid && user.totp_backup_codes?.length) {
        const remaining = await consumeBackupCode(code, user.totp_backup_codes);
        if (remaining) {
          valid = true;
          await userRepository.updateBackupCodes(user.id, remaining);
        }
      }

      if (!valid) {
        res.status(401).json({ error: 'Code invalide' });
        return;
      }

      await userRepository.updateLastLogin(user.id);
      const token = generateToken(user.id, user.email);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
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
};
