import { loadConfig } from './config.js';
import { initSession, closeAllSessions } from './whatsapp.js';
import { sendToWebhook } from './webhook.js';
import { createApi } from './api.js';

const PORT = process.env.PORT || 3000;

async function main() {
    console.log('Loading config...');
    const config = loadConfig();
    console.log(`Found ${config.instances.length} instance(s)`);

    const onMessage = (instance) => (message) => {
        console.log(`[${instance.phone_number}] Incoming: ${message.from}`);
        sendToWebhook(instance, message);
    };

    console.log('Initializing WhatsApp sessions...');
    for (const instance of config.instances) {
        console.log(`[${instance.phone_number}] Starting session...`);
        await initSession(instance, onMessage(instance));
    }

    const app = createApi(config);
    
    const server = app.listen(PORT, () => {
        console.log(`API listening on port ${PORT}`);
    });

    const shutdown = async () => {
        console.log('Shutting down...');
        server.close();
        await closeAllSessions();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
