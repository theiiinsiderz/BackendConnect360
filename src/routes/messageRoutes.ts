import crypto from 'crypto';
import { Router } from 'express';
import prisma from '../prisma';
import { consumeRateLimit } from '../services/dropRateLimitService';
import {
    generatePublicDropToken,
    getDropResponseJitterMs,
    hashDropToken,
    isValidDropTokenFormat,
    sanitizeDropContent,
} from '../services/dropSecurity';

const router = Router();

const MESSAGE_MAX_CHARS = 300;
const MESSAGE_TTL_DAYS = 7;
const MAX_GETS_PER_IP_PER_MINUTE = 120;
const MAX_POSTS_PER_IP_PER_MINUTE = 20;
const MAX_GETS_PER_TOKEN_PER_MINUTE = 300;
const MAX_POSTS_PER_TOKEN_PER_MINUTE = 40;
const TOKEN_DAILY_LIMIT = 250;
const TOKEN_COOLDOWN_SECONDS = 5;
const MAX_MESSAGES_PER_FETCH = 100;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getRequesterIp = (req: any): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return String(forwardedFor[0]);
    }
    return req.ip || req.socket?.remoteAddress || '0.0.0.0';
};

const setNoStoreHeaders = (res: any): void => {
    res.setHeader('Cache-Control', 'no-store, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

const genericFetchPayload = (messages: Array<{ id: string; content: string; createdAt: Date; expiresAt: Date }> = []) => ({
    ok: true,
    messages,
    ttlDays: MESSAGE_TTL_DAYS,
    serverTime: new Date().toISOString(),
});

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const renderDropPage = (token: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Anonymous Drop - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-1: #f8fafc;
            --bg-2: #e2e8f0;
            --card: #ffffff;
            --text: #0f172a;
            --muted: #475569;
            --line: #cbd5e1;
            --accent: #0f766e;
            --accent-soft: #ccfbf1;
            --accent-text: #042f2e;
            --danger: #b91c1c;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            font-family: 'IBM Plex Sans', sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at 12% 16%, #ccfbf133 0, #ccfbf100 36%),
                radial-gradient(circle at 85% 78%, #bae6fd44 0, #bae6fd00 34%),
                linear-gradient(160deg, var(--bg-1), var(--bg-2));
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            width: 100%;
            max-width: 460px;
            display: grid;
            gap: 14px;
        }

        .card {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        h1 {
            margin: 0 0 8px;
            font-size: 22px;
            letter-spacing: -0.02em;
        }

        .subtitle {
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.5;
        }

        .token {
            margin-top: 10px;
            font-size: 11px;
            color: #64748b;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px;
            word-break: break-all;
        }

        textarea {
            width: 100%;
            min-height: 120px;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 12px;
            font: inherit;
            resize: vertical;
            color: var(--text);
            background: #f8fafc;
        }

        textarea:focus {
            outline: 2px solid #14b8a61f;
            border-color: var(--accent);
        }

        .meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            color: var(--muted);
            font-size: 12px;
        }

        .actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        button {
            border: none;
            border-radius: 10px;
            padding: 11px 14px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

        .send {
            flex: 1;
            background: var(--accent);
            color: #ffffff;
        }

        .refresh {
            background: var(--accent-soft);
            color: var(--accent-text);
        }

        .status {
            margin-top: 10px;
            min-height: 20px;
            font-size: 13px;
            color: var(--muted);
        }

        .status.error {
            color: var(--danger);
        }

        .list {
            display: grid;
            gap: 8px;
            margin-top: 10px;
        }

        .item {
            border: 1px solid #dbeafe;
            background: #f8fafc;
            border-radius: 10px;
            padding: 10px;
        }

        .item-content {
            margin: 0 0 6px;
            color: #1e293b;
            line-height: 1.4;
            word-break: break-word;
        }

        .item-time {
            margin: 0;
            color: #64748b;
            font-size: 11px;
        }

        .empty {
            color: #64748b;
            font-size: 13px;
            margin-top: 6px;
        }
    </style>
</head>
<body>
    <div class="container">
        <section class="card">
            <h1>Anonymous Notice Drop</h1>
            <p class="subtitle">Send a short notice. No sender or receiver identity is stored. Messages expire in 7 days.</p>
            <p class="token">Drop Token: ${escapeHtml(token)}</p>
        </section>

        <section class="card">
            <textarea id="content" maxlength="300" placeholder="Write a short notice (max 300 chars)..."></textarea>
            <div class="meta">
                <span>Max 300 characters</span>
                <span id="counter">0/300</span>
            </div>
            <div class="actions">
                <button class="send" id="sendBtn">Send Notice</button>
                <button class="refresh" id="refreshBtn" type="button">Refresh</button>
            </div>
            <div class="status" id="status"></div>
            <div class="list" id="list"></div>
            <p class="empty" id="empty">No active notices right now.</p>
        </section>
    </div>

    <script>
        const token = ${JSON.stringify(token)};
        const contentEl = document.getElementById('content');
        const counterEl = document.getElementById('counter');
        const statusEl = document.getElementById('status');
        const listEl = document.getElementById('list');
        const emptyEl = document.getElementById('empty');
        const sendBtn = document.getElementById('sendBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        const setStatus = (message, isError = false) => {
            statusEl.className = isError ? 'status error' : 'status';
            statusEl.textContent = message || '';
        };

        const renderMessages = (messages) => {
            const now = Date.now();
            const active = (Array.isArray(messages) ? messages : []).filter((item) => {
                const expiry = new Date(item.expiresAt).getTime();
                return Number.isFinite(expiry) && expiry > now;
            });

            listEl.innerHTML = '';
            emptyEl.style.display = active.length ? 'none' : 'block';

            active.forEach((item) => {
                const wrapper = document.createElement('article');
                wrapper.className = 'item';

                const content = document.createElement('p');
                content.className = 'item-content';
                content.textContent = item.content;

                const meta = document.createElement('p');
                meta.className = 'item-time';
                meta.textContent = new Date(item.createdAt).toLocaleString();

                wrapper.appendChild(content);
                wrapper.appendChild(meta);
                listEl.appendChild(wrapper);
            });
        };

        const fetchMessages = async () => {
            try {
                const response = await fetch('/drop/' + encodeURIComponent(token), {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-store',
                });

                const payload = await response.json();
                renderMessages(payload.messages);
            } catch {
                setStatus('Could not refresh messages. Try again.', true);
            }
        };

        contentEl.addEventListener('input', () => {
            counterEl.textContent = contentEl.value.length + '/300';
        });

        sendBtn.addEventListener('click', async () => {
            const rawContent = contentEl.value || '';
            if (!rawContent.trim()) {
                setStatus('Message cannot be empty.', true);
                return;
            }

            sendBtn.disabled = true;
            setStatus('Sending...');

            try {
                const response = await fetch('/drop/' + encodeURIComponent(token), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    cache: 'no-store',
                    body: JSON.stringify({ content: rawContent }),
                });

                if (!response.ok) {
                    setStatus('Request was throttled. Try again shortly.', true);
                    sendBtn.disabled = false;
                    return;
                }

                contentEl.value = '';
                counterEl.textContent = '0/300';
                setStatus('Notice submitted.');
                await fetchMessages();
            } catch {
                setStatus('Could not send right now. Try again.', true);
            }

            sendBtn.disabled = false;
        });

        refreshBtn.addEventListener('click', fetchMessages);

        fetchMessages();
    </script>
</body>
</html>
`;

router.get('/drop-token', (_req, res) => {
    res.json({ token: generatePublicDropToken() });
});

router.get('/drop/:token', async (req, res) => {
    const { token } = req.params;
    const wantsJson = req.query.format === 'json' || req.accepts(['json', 'html']) === 'json';

    if (!wantsJson) {
        setNoStoreHeaders(res);
        return res.status(200).send(renderDropPage(token));
    }

    const requesterIp = getRequesterIp(req);
    const ipAllowed = consumeRateLimit('drop-get-ip', requesterIp, MAX_GETS_PER_IP_PER_MINUTE, 60_000);
    const tokenAllowed = consumeRateLimit('drop-get-token', token, MAX_GETS_PER_TOKEN_PER_MINUTE, 60_000);

    if (!ipAllowed || !tokenAllowed) {
        await delay(getDropResponseJitterMs());
        setNoStoreHeaders(res);
        return res.status(429).json(genericFetchPayload());
    }

    const tokenValid = isValidDropTokenFormat(token);
    if (!tokenValid) {
        await delay(getDropResponseJitterMs());
        setNoStoreHeaders(res);
        return res.status(200).json(genericFetchPayload());
    }

    const tokenHash = hashDropToken(token);
    const now = new Date();

    const messages = await prisma.message.findMany({
        where: {
            dropToken: tokenHash,
            expiresAt: {
                gt: now,
            },
        },
        select: {
            id: true,
            content: true,
            createdAt: true,
            expiresAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: MAX_MESSAGES_PER_FETCH,
    });

    await delay(getDropResponseJitterMs());
    setNoStoreHeaders(res);
    return res.status(200).json(genericFetchPayload(messages));
});

router.post('/drop/:token', async (req, res) => {
    const { token } = req.params;

    const requesterIp = getRequesterIp(req);
    const ipAllowed = consumeRateLimit('drop-post-ip', requesterIp, MAX_POSTS_PER_IP_PER_MINUTE, 60_000);
    const tokenAllowed = consumeRateLimit('drop-post-token', token, MAX_POSTS_PER_TOKEN_PER_MINUTE, 60_000);

    if (!ipAllowed || !tokenAllowed) {
        await delay(getDropResponseJitterMs());
        setNoStoreHeaders(res);
        return res.status(429).json({ ok: true, accepted: false });
    }

    const rawContent = typeof req.body?.content === 'string' ? req.body.content : '';
    const trimmedContent = rawContent.trim();
    const charCount = Array.from(trimmedContent).length;

    if (charCount < 1 || charCount > MESSAGE_MAX_CHARS) {
        await delay(getDropResponseJitterMs());
        setNoStoreHeaders(res);
        return res.status(400).json({ ok: false, error: 'Message length must be between 1 and 300 characters.' });
    }

    const tokenValid = isValidDropTokenFormat(token);
    if (!tokenValid) {
        await delay(getDropResponseJitterMs());
        setNoStoreHeaders(res);
        return res.status(202).json({ ok: true, accepted: true });
    }

    const tokenHash = hashDropToken(token);
    const sanitizedContent = sanitizeDropContent(trimmedContent);
    const messageId = crypto.randomUUID();

    // Single insert statement that also enforces per-token flood/cap thresholds.
    const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "Message" ("id", "dropToken", "content", "createdAt", "expiresAt")
        SELECT ${messageId}, ${tokenHash}, ${sanitizedContent}, NOW(), NOW() + INTERVAL '7 days'
        WHERE
            (
                SELECT COUNT(*)::INT
                FROM "Message"
                WHERE "dropToken" = ${tokenHash}
                  AND "createdAt" >= NOW() - INTERVAL '1 day'
            ) < ${TOKEN_DAILY_LIMIT}
            AND COALESCE(
                (
                    SELECT EXTRACT(EPOCH FROM (NOW() - MAX("createdAt")))
                    FROM "Message"
                    WHERE "dropToken" = ${tokenHash}
                ),
                999999
            ) >= ${TOKEN_COOLDOWN_SECONDS}
        RETURNING "id"
    `;

    await delay(getDropResponseJitterMs());
    setNoStoreHeaders(res);
    return res.status(202).json({ ok: true, accepted: inserted.length > 0 });
});

export default router;
