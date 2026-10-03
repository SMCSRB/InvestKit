import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { walletService } from '../services/walletService';

// Après toute action qui ÉCRIT (POST, PUT, PATCH, DELETE) et réussit, ajoute à la réponse JSON le portefeuille à jour (`wallet`) :
// le navigateur affiche tout de suite la vraie valeur du serveur, sans deuxième appel. Les erreurs (4xx, 5xx) et les lectures
// (GET) ne sont pas touchées. Si la lecture du portefeuille échoue, la réponse d'origine part telle quelle.
export const walletEcho = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const original = res.json.bind(res);
  res.json = ((body: any) => {
    const userId = req.user?.userId;
    if (!userId || res.statusCode >= 300 || !body || typeof body !== 'object' || Array.isArray(body) || 'wallet' in body) return original(body);
    walletService.snapshot(userId).then((wallet) => original({ ...body, wallet })).catch(() => original(body));
    return res;
  }) as typeof res.json;
  next();
};
