import type { Response } from 'express';

export const ok = <T>(response: Response, data: T, status = 200) =>
  response.status(status).json({ success: true, data });

export const fail = (response: Response, status: number, message: string, code: string) =>
  response.status(status).json({ success: false, error: { message, code } });
