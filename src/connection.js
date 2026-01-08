import makeWASocket, { DisconnectReason, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { useRedisAuthState, clearAuthState } from './auth-state.js';

const logger = pino({ level: 'silent' });

const sessions = new Map();
const messageStore = new Map();

export { clearAuthState as clearAuthData };

function storeMessage(phoneNumber, key, message) {
    const storeKey = `${phoneNumber}:${key.remoteJid}:${key.id}`;
    messageStore.set(storeKey, message);
}

function getMessage(phoneNumber) {
    return async (key) => {
        const storeKey = `${phoneNumber}:${key.remoteJid}:${key.id}`;
        return messageStore.get(storeKey) || null;
    };
}

export async function createConnection(instance, callbacks = {}) {
    const { onMessage, onQr, onConnected, onDisconnected } = callbacks;

    const { state, saveCreds } = await useRedisAuthState(instance.phone_number);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`[${instance.phone_number}] Starting session (WA ${version.join('.')})`);

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: Browsers.macOS('Safari'),
        version,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: getMessage(instance.phone_number),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: false,
        fireInitQueries: false,
        generateHighQualityLinkPreview: false,
        shouldSyncHistoryMessage: () => false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`  QR CODE FOR: ${instance.phone_number}`);
            console.log(`${'='.repeat(50)}\n`);
            qrcode.generate(qr, { small: true });
            
            if (onQr) {
                onQr(qr);
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;

            if (reason === DisconnectReason.loggedOut) {
                console.log(`[${instance.phone_number}] Logged out`);
                clearAuthState(instance.phone_number);
                sessions.delete(instance.phone_number);
                
                if (onDisconnected) {
                    onDisconnected('logged_out');
                }
                return;
            }

            if (reason === DisconnectReason.badSession || reason === 405) {
                console.log(`[${instance.phone_number}] Bad session, reconnecting...`);
                clearAuthState(instance.phone_number);
                sessions.delete(instance.phone_number);
                setTimeout(() => createConnection(instance, callbacks), 1000);
                return;
            }

            if (reason === DisconnectReason.restartRequired) {
                createConnection(instance, callbacks);
                return;
            }

            console.log(`[${instance.phone_number}] Disconnected (${reason}), reconnecting...`);
            
            if (onDisconnected) {
                onDisconnected(reason);
            }
            
            setTimeout(() => createConnection(instance, callbacks), 5000);
        }

        if (connection === 'open') {
            console.log(`[${instance.phone_number}] Connected`);
            
            if (onConnected) {
                onConnected();
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            storeMessage(instance.phone_number, msg.key, msg.message);
            
            if (msg.key.fromMe) continue;

            const text = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || 
                         null;

            if (!text) continue;

            if (onMessage) {
                onMessage({
                    from: msg.key.remoteJid,
                    to: instance.phone_number,
                    text,
                    timestamp: msg.messageTimestamp,
                });
            }
        }
    });

    sessions.set(instance.phone_number, sock);
    return sock;
}

export function getSession(phoneNumber) {
    return sessions.get(phoneNumber) || null;
}

export function hasActiveSession(phoneNumber) {
    const session = sessions.get(phoneNumber);
    return session?.user?.id != null;
}

export function getAllSessions() {
    return sessions;
}

export async function closeSession(phoneNumber) {
    const session = sessions.get(phoneNumber);
    if (session) {
        console.log(`[${phoneNumber}] Closing session...`);
        try {
            await session.end();
        } catch {
        }
        sessions.delete(phoneNumber);
    }
}

export async function closeAllSessions() {
    for (const [phone] of sessions) {
        await closeSession(phone);
    }
}
