"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_WEBHOOK_SECRET_HEADER = void 0;
exports.verifyMaxWebhookSecret = verifyMaxWebhookSecret;
const node_crypto_1 = require("node:crypto");
/** Имя заголовка с секретом подписки (см. POST /subscriptions). */
exports.MAX_WEBHOOK_SECRET_HEADER = 'x-max-bot-api-secret';
/**
 * Сравнивает секрет из заголовка вебхука с ожидаемым значением.
 * Подходит для Node.js IncomingMessage / Fetch Request
 * (нормализуйте имя заголовка в нижний регистр).
 */
function verifyMaxWebhookSecret(headerValue, expectedSecret) {
    const received = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (received === undefined)
        return false;
    const enc = new TextEncoder();
    const a = enc.encode(received);
    const b = enc.encode(expectedSecret);
    if (a.length !== b.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(a, b);
}
