import { 
    createConnection, 
    getSession, 
    hasActiveSession, 
    closeAllSessions,
    clearAuthData
} from './connection.js';

export { 
    getSession, 
    hasActiveSession, 
    closeAllSessions,
    clearAuthData
};

export async function initSession(instance, onMessage) {
    return createConnection(instance, { onMessage });
}

export async function sendMessage(phoneNumber, to, message) {
    const session = getSession(phoneNumber);

    if (!session) {
        throw new Error('No active session');
    }

    if (!session.user?.id) {
        throw new Error('Session not connected');
    }

    const toJid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    const result = await session.sendMessage(toJid, { text: message });
    return result;
}
