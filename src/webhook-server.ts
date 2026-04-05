import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import createDebug from 'debug';

import type { Update } from './core/network/api';
import { MAX_WEBHOOK_SECRET_HEADER, verifyMaxWebhookSecret } from './webhook';

const debug = createDebug('one-me:webhook-server');

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function normalizePath(p: string): string {
  if (!p || p === '/') return '/';
  const trimmed = p.replace(/\/$/, '');
  return trimmed === '' ? '/' : trimmed;
}

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
export function startMaxWebhookServer(opts: WebhookServerOptions): Promise<Server> {
  const expectedPath = normalizePath(opts.path);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let pathname: string;
    try {
      pathname = normalizePath(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    } catch {
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
        const h = req.headers[MAX_WEBHOOK_SECRET_HEADER];
        if (!verifyMaxWebhookSecret(h, opts.secret)) {
          res.writeHead(403);
          res.end();
          return;
        }
      }

      const raw = await readBody(req);
      let update: Update;
      try {
        update = JSON.parse(raw.toString('utf8')) as Update;
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }

      await opts.onUpdate(update);
      res.writeHead(200);
      res.end();
    } catch (err) {
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

  return new Promise<Server>((resolve, reject) => {
    server.once('listening', () => resolve(server));
    server.once('error', reject);
    server.listen(opts.port, opts.host ?? '0.0.0.0');
  });
}
