"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const debug_1 = __importDefault(require("debug"));
const composer_1 = require("./composer");
const context_1 = require("./context");
const api_1 = require("./core/network/api");
const polling_1 = require("./core/network/polling");
const webhook_server_1 = require("./webhook-server");
const api_2 = require("./api");
const debug = (0, debug_1.default)('one-me:main');
const defaultConfig = {
    contextType: context_1.Context,
};
class Bot extends composer_1.Composer {
    constructor(token, config) {
        super();
        this.isStarted = false;
        this.handleError = (err, ctx) => {
            process.exitCode = 1;
            console.error('Unhandled error while processing', ctx.update);
            throw err;
        };
        this.start = async (options) => {
            if (this.isStarted) {
                debug('Bot already started');
                return;
            }
            this.botInfo ?? (this.botInfo = await this.api.getMyInfo());
            debug(`Starting @${this.botInfo.username}`);
            if (options?.webhook) {
                const { url, secret, updateTypes, listen, } = options.webhook;
                const types = updateTypes ?? options.allowedUpdates ?? [];
                if (listen !== undefined) {
                    let pathname;
                    try {
                        pathname = new URL(url).pathname || '/';
                    }
                    catch {
                        throw new TypeError(`Invalid webhook url: ${url}`);
                    }
                    this.webhookServer = await (0, webhook_server_1.startMaxWebhookServer)({
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
            this.polling = new polling_1.Polling(this.api, options?.allowedUpdates ?? []);
            await this.polling.loop(this.handleUpdate);
        };
        this.stop = () => {
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
        this.handleUpdate = async (update) => {
            const updateId = `${update.update_type}:${update.timestamp}`;
            debug(`Processing update ${updateId}`);
            const UpdateContext = this.config.contextType;
            const ctx = new UpdateContext(update, this.api, this.botInfo);
            try {
                await this.middleware()(ctx, () => Promise.resolve(undefined));
            }
            catch (err) {
                await this.handleError(err, ctx);
            }
            finally {
                debug(`Finished processing update ${updateId}`);
            }
        };
        // @ts-ignore
        this.config = { ...defaultConfig, ...config };
        this.api = new api_2.Api((0, api_1.createClient)(token, this.config.clientOptions));
        debug('Created `Bot` instance');
    }
    catch(handler) {
        this.handleError = handler;
        return this;
    }
}
exports.Bot = Bot;
