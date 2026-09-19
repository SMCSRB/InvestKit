import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

// TODO: Remplacer par une vraie BD (PostgreSQL)
interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  verified: boolean;
  verificationCode?: string;
}

const users: Map<string, User> = new Map();

export const authController = {
  register: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, profile } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = Array.from(users.values()).find(u => u.email === email);
      if (existingUser) {
        res.status(409).json({ error: 'Cet email est déjà utilisé' });
        return;
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const userId = uuidv4();
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newUser: User = {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        createdAt: new Date(),
        verified: false,
        verificationCode,
      };

      users.set(userId, newUser);

      // TODO: Envoyer email de vérification

      res.status(201).json({
        success: true,
        message: 'Inscription réussie. Vérifiez votre email.',
        userId,
        verificationCode: env.isDev ? verificationCode : undefined, // Afficher le code en dev uniquement
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  },

  verifyEmail: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId, verificationCode } = req.body;

      if (!userId || !verificationCode) {
        res.status(400).json({ error: 'Données manquantes' });
        return;
      }

      const user = users.get(userId);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      if (user.verificationCode !== verificationCode) {
        res.status(400).json({ error: 'Code de vérification invalide' });
        return;
      }

      user.verified = true;
      user.verificationCode = undefined;

      res.json({
        success: true,
        message: 'Email vérifié avec succès',
        user: { id: user.id, email: user.email, firstName: user.firstName },
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  },

  login: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email et mot de passe requis' });
        return;
      }

      const user = Array.from(users.values()).find(u => u.email === email);
      if (!user) {
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        return;
      }

      if (!user.verified) {
        res.status(403).json({ error: 'Veuillez vérifier votre email d\'abord' });
        return;
      }

      const token = generateToken(user.id, user.email);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
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

      const user = Array.from(users.values()).find(u => u.email === email);
      if (!user) {
        // Pour des raisons de sécurité, ne pas révéler si l'email existe
        res.json({
          success: true,
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        });
        return;
      }

      // TODO: Générer un token de réinitialisation et l'envoyer par email

      res.json({
        success: true,
        message: 'Lien de réinitialisation envoyé à votre email',
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

      // TODO: Valider le resetToken et réinitialiser le mot de passe

      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
  },

  getCurrentUser: (req: AuthRequest, res: Response): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const user = users.get(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  },
};

// Import env pour isDev
import { env } from '../config/env';
