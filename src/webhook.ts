import { timingSafeEqual } from 'node:crypto';

/** Имя заголовка с секретом подписки (см. POST /subscriptions). */
export const MAX_WEBHOOK_SECRET_HEADER = 'x-max-bot-api-secret';

/**
 * Сравнивает секрет из заголовка вебхука с ожидаемым значением.
 * Подходит для Node.js IncomingMessage / Fetch Request
 * (нормализуйте имя заголовка в нижний регистр).
 */
export function verifyMaxWebhookSecret(
  headerValue: string | string[] | undefined,
  expectedSecret: string,
): boolean {
  const received = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (received === undefined) return false;
  const enc = new TextEncoder();
  const a = enc.encode(received);
  const b = enc.encode(expectedSecret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
