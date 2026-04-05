import type { Server } from 'node:http';
import createDebug from 'debug';
import { Composer } from './composer';
import { Context } from './context';
import { MaybePromise } from './core/helpers/types';

import {
  BotInfo, ClientOptions, createClient, Update, UpdateType,
} from './core/network/api';
import { Polling } from './core/network/polling';
import { startMaxWebhookServer } from './webhook-server';

import { Api } from './api';

const debug = createDebug('one-me:main');

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

const defaultConfig: BotConfig<Context> = {
  contextType: Context,
};

export class Bot<Ctx extends Context = Context> extends Composer<Ctx> {
  api: Api;

  public botInfo?: BotInfo;

  private polling?: Polling;

  private webhookServer?: Server;

  private isStarted = false;

  private config: BotConfig<Ctx>;

  constructor(token: string, config?: Partial<BotConfig<Ctx>>) {
    super();

    // @ts-ignore
    this.config = { ...defaultConfig, ...config };
    this.api = new Api(createClient(token, this.config.clientOptions));

    debug('Created `Bot` instance');
  }

  private handleError = (err: unknown, ctx: Ctx): MaybePromise<void> => {
    process.exitCode = 1;
    console.error('Unhandled error while processing', ctx.update);
    throw err;
  };

  catch(handler: (err: unknown, ctx: Ctx) => MaybePromise<void>) {
    this.handleError = handler;
    return this;
  }

  start = async (options?: LaunchOptions) => {
    if (this.isStarted) {
      debug('Bot already started');
      return;
    }

    this.botInfo ??= await this.api.getMyInfo();
    debug(`Starting @${this.botInfo.username}`);

    if (options?.webhook) {
      const {
        url, secret, updateTypes, listen,
      } = options.webhook;
      const types = updateTypes ?? options.allowedUpdates ?? [];

      if (listen !== undefined) {
        let pathname: string;
        try {
          pathname = new URL(url).pathname || '/';
        } catch {
          throw new TypeError(`Invalid webhook url: ${url}`);
        }
        this.webhookServer = await startMaxWebhookServer({
          path: pathname,
          port: listen.port,
          host: listen.host,
          ...(secret !== undefined ? { secret } : {}),
          onUpdate: this.handleUpdate,
        });
      }

      const res = await this.api.setWebhook({
        url,
        ...(secret !== undefined ? { secret } : {}),
        ...(types.length > 0 ? { update_types: types } : {}),
      });
      if (!res.success) {
        this.webhookServer?.close();
        this.webhookServer = undefined;
        throw new Error(res.message ?? 'Failed to register webhook subscription');
      }
      debug(`Webhook subscription registered: ${url}`);

      this.isStarted = true;
      return;
    }

    this.isStarted = true;
    this.polling = new Polling(this.api, options?.allowedUpdates ?? []);
    await this.polling.loop(this.handleUpdate);
  };

  stop = () => {
    if (!this.isStarted) {
      debug('Bot is not running');
      return;
    }

    this.polling?.stop();
    this.polling = undefined;
    this.webhookServer?.close();
    this.webhookServer = undefined;
    this.isStarted = false;
  };

  public handleUpdate = async (update: Update) => {
    const updateId = `${update.update_type}:${update.timestamp}`;
    debug(`Processing update ${updateId}`);

    const UpdateContext = this.config.contextType;
    const ctx = new UpdateContext(update, this.api, this.botInfo);

    try {
      await this.middleware()(ctx, () => Promise.resolve(undefined));
    } catch (err) {
      await this.handleError(err, ctx);
    } finally {
      debug(`Finished processing update ${updateId}`);
    }
  };
}
