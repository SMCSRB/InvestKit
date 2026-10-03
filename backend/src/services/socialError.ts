export type SocialErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'LIMIT';
export class SocialError extends Error {
  constructor(public code: SocialErrorCode, message: string, public detail?: Record<string, unknown>) { super(message); this.name = 'SocialError'; }
}
