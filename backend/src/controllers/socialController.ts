import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { socialService, SocialError } from '../services/socialService';

const STATUS = { INVALID_INPUT: 400, NOT_FOUND: 404, FORBIDDEN: 403, CONFLICT: 409, LIMIT: 429 } as const;

const handle = (fallback: string, fn: (req: AuthRequest, uid: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await fn(req, req.user!.userId));
    } catch (error) {
      if (error instanceof SocialError) { res.status(STATUS[error.code]).json({ error: error.message, code: error.code }); return; }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
  };

export const socialController = {
  me: handle('Erreur lors de la lecture de ton profil social', (_r, u) => socialService.me(u)),
  friends: handle('Erreur lors de la lecture des amis', (_r, u) => socialService.friends(u)),
  friendsRanking: handle('Erreur lors de la lecture du classement des amis', (_r, u) => socialService.friendsRanking(u)),
  requests: handle('Erreur lors de la lecture des demandes', (_r, u) => socialService.requests(u)),
  sendRequest: handle('Erreur lors de l\'envoi de la demande', (r, u) => socialService.sendRequest(u, r.body?.friendCode, r.ip)),
  accept: handle('Erreur lors de la réponse', (r, u) => socialService.respond(u, String(r.params.id), 'accept')),
  decline: handle('Erreur lors de la réponse', (r, u) => socialService.respond(u, String(r.params.id), 'decline')),
  cancel: handle('Erreur lors de l\'annulation', (r, u) => socialService.respond(u, String(r.params.id), 'cancel')),
  removeFriend: handle('Erreur lors de la suppression de l\'ami', (r, u) => socialService.removeFriend(u, r.params.userId)),
  block: handle('Erreur lors du blocage', (r, u) => socialService.block(u, r.body?.userId, r.ip)),
  unblock: handle('Erreur lors du déblocage', (r, u) => socialService.unblock(u, r.params.userId)),
  blocks: handle('Erreur lors de la lecture des blocages', (_r, u) => socialService.blocks(u)),
  guild: handle('Erreur lors de la lecture de la guilde', (_r, u) => socialService.myGuild(u)),
  createGuild: handle('Erreur lors de la création de la guilde', (r, u) => socialService.createGuild(u, r.body?.name, r.body?.description, r.ip)),
  joinGuild: handle('Erreur lors de l\'entrée dans la guilde', (r, u) => socialService.joinGuild(u, r.body?.code)),
  leaveGuild: handle('Erreur lors du départ de la guilde', (_r, u) => socialService.leaveGuild(u)),
  kick: handle('Erreur lors du retrait du membre', (r, u) => socialService.kick(u, r.body?.userId, r.ip)),
  transfer: handle('Erreur lors du transfert de la guilde', (r, u) => socialService.transfer(u, r.body?.userId)),
  regenerateInvite: handle('Erreur lors du changement du code', (_r, u) => socialService.regenerateInvite(u)),
  disband: handle('Erreur lors de la dissolution', (r, u) => socialService.disband(u, r.ip)),
};
