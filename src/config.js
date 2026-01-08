import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';

const CONFIG_PATH = process.env.CONFIG_PATH || './config.yaml';

export function loadConfig() {
    if (!existsSync(CONFIG_PATH)) {
        throw new Error(`Config file not found: ${CONFIG_PATH}`);
    }

    const content = readFileSync(CONFIG_PATH, 'utf8');
    const config = parse(content);

    validateConfig(config);
    return config;
}

function validateConfig(config) {
    if (!config || !Array.isArray(config.instances)) {
        throw new Error('Invalid config: "instances" must be an array');
    }

    if (config.instances.length === 0) {
        throw new Error('Invalid config: at least one instance required');
    }

    const phoneNumbers = new Set();
    const apiKeys = new Set();

    for (const instance of config.instances) {
        if (!instance.phone_number || typeof instance.phone_number !== 'string') {
            throw new Error('Invalid config: phone_number is required and must be a string');
        }

        if (!instance.api_key || typeof instance.api_key !== 'string') {
            throw new Error('Invalid config: api_key is required and must be a string');
        }

        if (instance.api_key.trim() === '') {
            throw new Error('Invalid config: api_key cannot be empty');
        }

        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(instance.phone_number)) {
            throw new Error(`Invalid phone number format: ${instance.phone_number}`);
        }

        if (phoneNumbers.has(instance.phone_number)) {
            throw new Error(`Duplicate phone_number: ${instance.phone_number}`);
        }
        phoneNumbers.add(instance.phone_number);

        if (apiKeys.has(instance.api_key)) {
            throw new Error(`Duplicate api_key detected`);
        }
        apiKeys.add(instance.api_key);

        if (instance.webhook) {
            if (!instance.webhook.url || typeof instance.webhook.url !== 'string') {
                throw new Error(`Invalid webhook url for ${instance.phone_number}`);
            }

            try {
                new URL(instance.webhook.url);
            } catch {
                throw new Error(`Invalid webhook URL format for ${instance.phone_number}`);
            }

            if (instance.webhook.basic_auth) {
                if (!instance.webhook.basic_auth.username || !instance.webhook.basic_auth.password) {
                    throw new Error(`Invalid webhook basic_auth for ${instance.phone_number}`);
                }
            }
        }
    }
}

export function getInstanceByApiKey(config, apiKey) {
    return config.instances.find(i => i.api_key === apiKey) || null;
}

export function getInstanceByPhoneNumber(config, phoneNumber) {
    return config.instances.find(i => i.phone_number === phoneNumber) || null;
}

export function phoneToJid(phoneNumber) {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    return `${cleaned}@s.whatsapp.net`;
}

export function jidToPhone(jid) {
    const match = jid.match(/^(\d+)@/);
    return match ? `+${match[1]}` : null;
}
