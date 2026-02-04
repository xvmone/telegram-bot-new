# Telegram Referral Contest Bot Architecture

## Tech stack
- **Language**: TypeScript (Node.js LTS) for fast iteration and strong ecosystem support.
- **Bot framework**: Telegraf for Telegram Bot API integration and middleware.
- **API framework**: NestJS (or Fastify + custom modules) for structured services and HTTP admin APIs.
- **Admin panel**: React (Vite) + Ant Design (or MUI) served via separate frontend app.
- **Auth**: JWT for admin sessions, optional SSO/OIDC integration.
- **Database**: PostgreSQL with Prisma (or TypeORM) for schema migrations and data access.
- **Cache/queue**: Redis for caching, rate limiting, idempotency, and background job queues.
- **Job processing**: BullMQ (Redis-backed) for async tasks (rewarding, fraud checks).
- **Infra**: Docker + Kubernetes, NGINX ingress, Prometheus + Grafana, Loki/ELK.

## High-level architecture diagram (text)
```
                 +---------------------------+
                 |        Admin Panel        |
                 |   React SPA (Vite/MUI)    |
                 +-------------+-------------+
                               |
                               | HTTPS (JWT)
                               v
+--------------------+   +-----+------------------+   +-------------------+
| Telegram Users     |   |  Admin/API Service     |   |  Webhook Gateway  |
| (Bot Clients)      |   |  (NestJS/Fastify)      |   | (Telegraf Webhook)|
+---------+----------+   +-----+------------------+   +---------+---------+
          |                      |                              |
          | Telegram Bot API      | Internal RPC/HTTP            | Bot Updates
          v                      v                              v
+---------+----------+   +-----------------------+   +----------------------+
| Telegram Bot API   |   |   Core Services       |   |  Fraud/Risk Service  |
+--------------------+   |  (referrals, rewards) |   | (rules + signals)    |
                         +-----------+-----------+   +----------+-----------+
                                     |                          |
                                     v                          v
                           +----------------+           +-------------------+
                           | PostgreSQL     |           | Redis             |
                           | users/referrals|           | cache/queues/rate |
                           +----------------+           +-------------------+
                                     |
                                     v
                           +----------------+
                           | Analytics/BI   |
                           | (ClickHouse/  |
                           |  BigQuery opt)|
                           +----------------+
```

## Database choice (PostgreSQL)
PostgreSQL is selected for its strong consistency guarantees, relational integrity (referral chains, rewards, fraud flags), and mature indexing and JSONB support. It supports complex queries for leaderboard aggregation, anti-fraud heuristics, and admin reporting while remaining reliable under high load with read replicas and partitioning.

## Redis usage
Redis serves four primary roles:
1. **Caching**: Leaderboard snapshots, referral lookups, and hot configuration values.
2. **Rate limiting**: Per-user and per-IP throttles for bot interactions.
3. **Queues**: Background jobs for reward calculation, anti-fraud checks, and notification sending.
4. **Idempotency/locks**: Ensuring updates are processed once and avoiding duplicate rewards.

## Folder structure (overview)
```
/telegram-bot-new
  /apps
    /bot-gateway        # Telegraf webhook handler
    /admin-api          # Admin API (NestJS/Fastify)
    /admin-web          # React admin panel
  /services
    /referral-core      # Referral logic, rewards, leaderboard
    /fraud-detection    # Fraud heuristics and signal scoring
  /packages
    /db                 # Prisma schema, migrations, shared models
    /redis              # Redis clients, queue definitions
    /common             # Shared utilities, DTOs, config
  /infra
    /k8s                # Helm charts / manifests
    /monitoring         # Prometheus/Grafana/Loki configs
  /docs
    architecture.md     # System design and decisions
```
