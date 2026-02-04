# Telegram Referral Contest Bot (Core Logic)

## Project folder structure
```
./
├── package.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── bot/
│   │   └── index.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── handlers/
│   │   └── start.ts
│   ├── services/
│   │   ├── notifications.ts
│   │   ├── referrals.ts
│   │   ├── subscriptions.ts
│   │   └── users.ts
│   └── index.ts
├── ARCHITECTURE.md
├── PRISMA_SCHEMA.md
├── README.md
└── tsconfig.json
```

## Environment variables
- `TELEGRAM_BOT_TOKEN`: Bot token from BotFather.
- `DATABASE_URL`: PostgreSQL connection string.
- `ACTIVE_CONTEST_ID`: Contest ID used for referrals.
- `MANDATORY_CHANNELS`: Comma-separated list of channel IDs or usernames (e.g. `-100123,@channel`).

## Core logic overview
- `/start` creates or updates a user record and handles referral deep links (`ref_<telegramId>`).
- Referrals are created with status `PENDING` when the invitee arrives.
- Mandatory channel membership is verified via `getChatMember`.
- Once a user is subscribed to all required channels, referrals are marked `REAL` and the inviter is notified.
- Banned users receive a restricted message and are blocked from referral processing.
