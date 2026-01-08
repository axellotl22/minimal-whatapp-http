import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
    console.log('[Redis] Connected');
});

redis.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
});

function getKey(phoneNumber, type, id = null) {
    const base = `wa:${phoneNumber}`;
    if (id) {
        return `${base}:${type}:${id}`;
    }
    return `${base}:${type}`;
}

export async function clearAuthState(phoneNumber) {
    const pattern = `wa:${phoneNumber}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
    console.log(`[${phoneNumber}] Redis auth state cleared (${keys.length} keys)`);
}

export async function useRedisAuthState(phoneNumber) {
    const credsKey = getKey(phoneNumber, 'creds');
    
    let creds;
    const savedCreds = await redis.get(credsKey);
    if (savedCreds) {
        creds = JSON.parse(savedCreds, BufferJSON.reviver);
    } else {
        creds = initAuthCreds();
    }

    const saveCreds = async () => {
        await redis.set(credsKey, JSON.stringify(creds, BufferJSON.replacer));
    };

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const key = getKey(phoneNumber, type, id);
                        const value = await redis.get(key);
                        if (value) {
                            let parsed = JSON.parse(value, BufferJSON.reviver);
                            if (type === 'app-state-sync-key') {
                                parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
                            }
                            data[id] = parsed;
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const pipeline = redis.pipeline();
                    for (const category in data) {
                        for (const id in data[category]) {
                            const key = getKey(phoneNumber, category, id);
                            const value = data[category][id];
                            if (value) {
                                pipeline.set(key, JSON.stringify(value, BufferJSON.replacer));
                            } else {
                                pipeline.del(key);
                            }
                        }
                    }
                    await pipeline.exec();
                },
            },
        },
        saveCreds,
    };
}

export async function hasAuthState(phoneNumber) {
    const credsKey = getKey(phoneNumber, 'creds');
    const exists = await redis.exists(credsKey);
    return exists === 1;
}
