import express from 'express';
import { getInstanceByApiKey } from './config.js';
import { hasActiveSession, sendMessage } from './whatsapp.js';

function requireAuth(config) {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['X-Api-Key'];

        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return res.status(401).json({ error: 'Missing API key' });
        }

        const instance = getInstanceByApiKey(config, apiKey.trim());

        if (!instance) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        req.instance = instance;
        next();
    };
}

export function createApi(config) {
    const app = express();

    app.use(express.json());

    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    app.post('/send', requireAuth(config), async (req, res) => {
        const { to, message } = req.body;

        if (!to || typeof to !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "to" field' });
        }

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "message" field' });
        }

        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(to)) {
            return res.status(400).json({ error: 'Invalid phone number format for "to"' });
        }

        if (!hasActiveSession(req.instance.phone_number)) {
            return res.status(503).json({ error: 'WhatsApp session not connected' });
        }

        try {
            await sendMessage(req.instance.phone_number, to, message);

            res.json({
                status: 'sent',
                to,
            });
        } catch (error) {
            console.error(`[${req.instance.phone_number}] Send failed: ${error.message}`);
            res.status(500).json({ error: 'Failed to send message' });
        }
    });

    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    return app;
}
