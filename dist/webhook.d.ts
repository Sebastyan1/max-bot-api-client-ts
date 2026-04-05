/** Имя заголовка с секретом подписки (см. POST /subscriptions). */
export declare const MAX_WEBHOOK_SECRET_HEADER = "x-max-bot-api-secret";
/**
 * Сравнивает секрет из заголовка вебхука с ожидаемым значением.
 * Подходит для Node.js IncomingMessage / Fetch Request
 * (нормализуйте имя заголовка в нижний регистр).
 */
export declare function verifyMaxWebhookSecret(headerValue: string | string[] | undefined, expectedSecret: string): boolean;
