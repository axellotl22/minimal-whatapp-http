const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export async function sendToWebhook(instance, payload) {
    if (!instance.webhook?.url) {
        return;
    }

    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const headers = {
                'Content-Type': 'application/json',
            };

            if (instance.webhook.basic_auth) {
                const credentials = Buffer.from(
                    `${instance.webhook.basic_auth.username}:${instance.webhook.basic_auth.password}`
                ).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }

            const response = await fetch(instance.webhook.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                return;
            }

            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }

        if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY * Math.pow(2, attempt);
            await sleep(delay);
        }
    }

    console.error(`[${instance.phone_number}] Webhook failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
