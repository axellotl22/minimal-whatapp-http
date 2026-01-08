import { loadConfig } from './config.js';

try {
    const config = loadConfig();
    console.log('✓ Config is valid');
    console.log(`  Instances: ${config.instances.length}`);
    
    for (const instance of config.instances) {
        const hasWebhook = instance.webhook?.url ? 'yes' : 'no';
        console.log(`  - ${instance.phone_number} (webhook: ${hasWebhook})`);
    }
    
    process.exit(0);
} catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
}

