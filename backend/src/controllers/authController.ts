import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';
import { env } from '../config/env';
import { sendVerificationEmail } from '../utils/email';
import { verifyCaptcha } from '../utils/captcha';

export const authController = {
  register: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, captchaToken } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      // TODO: Captcha verification disabled temporarily
      // Will re-enable when proper captcha keys are configured
      // if (!captchaToken) {
      //   res.status(400).json({ error: 'Le captcha est requis' });
      //   return;
      // }
      // const captchaValid = await verifyCaptcha(captchaToken);
      // if (!captchaValid) {
      //   res.status(400).json({ error: 'Captcha invalide ou expiré' });
      //   return;
      // }

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

      // Créer l'utilisateur en BD
      const newUser = await userRepository.create({
        email,
        password_hash: hashedPassword,
        first_name: 'Unknown',
        last_name: 'Unknown',
        verification_code: verificationCode,
        verification_code_expires_at: verificationCodeExpiresAt,
      });

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

      await userRepository.verifyEmail(user.id);

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
      const { email, username, accountType, interests, language, enable2FA } = req.body;

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
      await userRepository.updatePreferences(user.id, {
        username: username.trim(),
        account_type: accountType,
        interests: JSON.stringify(interests || []),
        language: language || 'fr',
        enable_2fa: enable2FA || false,
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
    } catch (error) {
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
        },
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
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
};
