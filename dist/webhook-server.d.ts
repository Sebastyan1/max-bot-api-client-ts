import { type Server } from 'node:http';
import type { Update } from './core/network/api';
export type WebhookServerOptions = {
    /** Pathname из публичного webhook URL (например `/max/webhook`). */
    path: string;
    secret?: string;
    port: number;
    host?: string;
    onUpdate: (update: Update) => Promise<void>;
};
/**
 * Поднимает HTTP-сервер: POST на `path`, тело — JSON Update.
 * Опционально проверка заголовка `X-Max-Bot-Api-Secret`.
 */
export declare function startMaxWebhookServer(opts: WebhookServerOptions): Promise<Server>;
