# Minimal WhatsApp HTTP API

A minimal WhatsApp API wrapper based on [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

> ⚠️ **DISCLAIMER**
> 
> This is an **unofficial** API wrapper. It is **not affiliated with, endorsed by, or connected to WhatsApp or Meta** in any way.
> 
> **Use at your own risk.** The author assumes no responsibility for any consequences arising from the use of this software, including but not limited to account bans, data loss, or violations of WhatsApp's Terms of Service.
> 
> This software is provided **free of charge** for anyone to use, modify, and distribute.

## Features

- Multi-account support via YAML configuration
- API key based authentication
- No `from` manipulation possible by clients
- Webhook support for incoming messages
- Redis-backed session persistence
- Docker-ready (no local Node.js installation required)

## Quick Start

```bash
# 1. Create configuration
cp config.example.yaml config.yaml
# Edit config.yaml with your settings

# 2. Start containers (QR codes will appear in terminal)
./deploy.sh
```

## API

### Send Message

```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"to": "+1234567890", "message": "Hello World"}'
```

**Response:**
```json
{"status": "sent", "to": "+1234567890"}
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Configuration

```yaml
instances:
  - phone_number: "+1234567890"
    api_key: "your-secret-api-key"
    webhook:                      # optional
      url: "https://example.com/webhook"
      basic_auth:                 # optional
        username: "user"
        password: "pass"
```

## Session Management

- **QR Code**: Automatically displayed in terminal on first start
- **Auth Data**: Persisted in Redis (survives container restarts)
- **Logout**: Auth data is automatically cleared when session is invalidated by WhatsApp

## Project Structure

```
├── src/
│   ├── index.js        # Server entrypoint
│   ├── config.js       # YAML loader + validation
│   ├── connection.js   # Baileys connection management
│   ├── auth-state.js   # Redis auth state
│   ├── whatsapp.js     # High-level WhatsApp functions
│   ├── api.js          # Express REST API
│   ├── webhook.js      # Webhook handler
│   └── validate.js     # Config validation
├── config.yaml         # Configuration (gitignored)
├── docker-compose.yml
├── Dockerfile
├── deploy.sh
└── openapi.yaml        # API documentation
```

## Docker Commands

```bash
# First start (scan QR codes)
./deploy.sh

# View logs
docker compose logs -f

# Stop
docker compose down

# Clear Redis data (forces new QR code scan)
docker exec whatsapp-redis redis-cli FLUSHALL
```

## License

This project is free to use for anyone. No warranty is provided.
