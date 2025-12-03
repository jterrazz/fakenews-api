# n00 API

News processing API that ingests real-world news, deduplicates and classifies them, then generates articles—including fabricated versions for a "spot the fake" game.

## How It Works

```
News Sources → Ingest → Deduplicate → Classify → Publish Articles → Generate Quizzes
```

**Pipeline** (runs every 2 hours):

1. **Ingest** — Fetches news, filters by significance (dynamic threshold based on daily quota)
2. **Deduplicate** — AI-powered semantic deduplication against recent reports
3. **Classify** — Assigns tier (General/Niche/Off-topic) and traits
4. **Publish** — Transforms reports into readable articles with multiple angles
5. **Challenge** — Generates quiz questions and fabricated article variants

## Quick Start

```bash
# Install
npm install

# Configure
cp config/local-development.yml config/local.yml
# Edit config/local.yml with your API keys

# Run (development)
npm run dev

# Run (production)
npm run build && npm start
```

## Configuration

Edit `config/local.yml`:

```yaml
outbound:
  openRouter:
    apiKey: 'your-openrouter-key'
  worldNews:
    apiKey: 'your-worldnews-key'
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Health check |
| `GET /articles` | List articles (supports `country`, `language`, `limit`, `offset`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Run linters |
| `npm run studio` | Open Prisma Studio |

## Architecture

```
src/
├── application/     # Use cases & ports
├── domain/          # Entities & value objects
├── infrastructure/  # Adapters (HTTP, DB, AI)
└── di/              # Dependency injection
```

## Tech Stack

- **Runtime**: Node.js 22, TypeScript
- **Framework**: Hono.js
- **Database**: SQLite + Prisma
- **AI**: OpenRouter (DeepSeek, Gemini, Grok)
- **Monitoring**: NewRelic

## License

MIT
