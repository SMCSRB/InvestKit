import { env } from '../config/env';

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  if (!token) {
    console.warn('⚠️ No captcha token provided');
    return false;
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        response: token,
        secret: process.env.HCAPTCHA_SECRET_KEY || '',
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ hCaptcha verified successfully');
      return true;
    } else {
      console.warn('❌ hCaptcha verification failed:', data['error-codes']);
      return false;
    }
  } catch (error) {
    console.error('❌ hCaptcha verification error:', error);
    return false;
  }
};
