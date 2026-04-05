"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMaxWebhookServer = startMaxWebhookServer;
const node_http_1 = require("node:http");
const debug_1 = __importDefault(require("debug"));
const webhook_1 = require("./webhook");
const debug = (0, debug_1.default)('one-me:webhook-server');
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}
function normalizePath(p) {
    if (!p || p === '/')
        return '/';
    const trimmed = p.replace(/\/$/, '');
    return trimmed === '' ? '/' : trimmed;
}
/**
 * Поднимает HTTP-сервер: POST на `path`, тело — JSON Update.
 * Опционально проверка заголовка `X-Max-Bot-Api-Secret`.
 */
function startMaxWebhookServer(opts) {
    const expectedPath = normalizePath(opts.path);
    const server = (0, node_http_1.createServer)(async (req, res) => {
        let pathname;
        try {
            pathname = normalizePath(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
        }
        catch {
            res.writeHead(400);
            res.end();
            return;
        }
        if (pathname !== expectedPath) {
            res.writeHead(404);
            res.end();
            return;
        }
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end();
            return;
        }
        try {
            if (opts.secret !== undefined) {
                const h = req.headers[webhook_1.MAX_WEBHOOK_SECRET_HEADER];
                if (!(0, webhook_1.verifyMaxWebhookSecret)(h, opts.secret)) {
                    res.writeHead(403);
                    res.end();
                    return;
                }
            }
            const raw = await readBody(req);
            let update;
            try {
                update = JSON.parse(raw.toString('utf8'));
            }
            catch {
                res.writeHead(400);
                res.end();
                return;
            }
            await opts.onUpdate(update);
            res.writeHead(200);
            res.end();
        }
        catch (err) {
            debug('Webhook request failed', err);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end();
            }
        }
    });
    server.on('listening', () => {
        const addr = server.address();
        debug('Webhook server listening %o', addr);
    });
    return new Promise((resolve, reject) => {
        server.once('listening', () => resolve(server));
        server.once('error', reject);
        server.listen(opts.port, opts.host ?? '0.0.0.0');
    });
}
