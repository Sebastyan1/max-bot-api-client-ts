import { Composer } from './composer';
import { Context } from './context';
import { MaybePromise } from './core/helpers/types';
import { BotInfo, ClientOptions, Update, UpdateType } from './core/network/api';
import { Api } from './api';
type BotConfig<Ctx extends Context> = {
    clientOptions?: ClientOptions;
    contextType: new (...args: ConstructorParameters<typeof Context>) => Ctx;
};
export type WebhookListenOptions = {
    /** Локальный порт (часто не 443: снаружи HTTPS проксируют сюда ngrok / nginx). */
    port: number;
    host?: string;
};
export type WebhookOptions = {
    /** Публичный HTTPS URL, который MAX будет вызывать (порт в строке не указывают). */
    url: string;
    /**
     * Передаётся в API как `secret`; при встроенном сервере (`listen`)
     * заголовок проверяется автоматически.
     */
    secret?: string;
    /** Соответствует полю `update_types` в API;
     * если не задано, используется `allowedUpdates` из `LaunchOptions`. */
    updateTypes?: UpdateType[];
    /**
     * Встроенный HTTP-сервер: POST на pathname из `url` (например `/webhook` из `https://host/webhook`).
     * Без `listen` подписка в MAX создаётся, но приём запросов нужно настроить самим.
     */
    listen?: WebhookListenOptions;
};
export type LaunchOptions = {
    allowedUpdates?: UpdateType[];
    /** Если задано, вызывается POST /subscriptions и long polling не запускается. */
    webhook?: WebhookOptions;
};
export declare class Bot<Ctx extends Context = Context> extends Composer<Ctx> {
    api: Api;
    botInfo?: BotInfo;
    private polling?;
    private webhookServer?;
    private isStarted;
    private config;
    constructor(token: string, config?: Partial<BotConfig<Ctx>>);
    private handleError;
    catch(handler: (err: unknown, ctx: Ctx) => MaybePromise<void>): this;
    start: (options?: LaunchOptions) => Promise<void>;
    stop: () => void;
    handleUpdate: (update: Update) => Promise<void>;
}
export {};
