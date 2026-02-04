# Prisma Schema Design: Telegram Referral Contest Bot

## Overview
This document explains the production-ready PostgreSQL schema defined in `prisma/schema.prisma`, including models, relations, indexes, constraints, and fraud-prevention mechanisms.

## Models and purpose

### User
Stores Telegram users by `telegramId` with optional `username` and display name. Includes ban fields for fraud control.

### Contest
Represents a referral contest with lifecycle status, start/end dates, and editable rules text.

### Referral
Captures who invited whom within a contest. Status supports `PENDING` and `REAL` with verification timestamps.

### Channel
Represents Telegram channels that can be required for contest eligibility, keyed by a stable `key` (ID or username) used in configuration.

### ContestChannel
Join table between contests and channels, marking channels as mandatory and specifying verification mode.

### UserChannelSubscription
Tracks whether a user is verified as a member of a channel to support subscription verification checks.

### ContestPrize
Stores prizes by category and rank; editable within a contest.

### Winner
Stores contest winners with a `randomSeedHash` for draw transparency and uniqueness constraints.

### AdminUser
Grants admin privileges to a user with a role.

### AdminAction
Logs administrative actions (ban, delete referral, extend contest, etc.) with optional targets and metadata.

## Relations between models
- **User ↔ Referral**: A user can send many referrals and receive at most one referral per contest.
- **Contest ↔ Referral**: Referrals are scoped to contests.
- **Contest ↔ ContestChannel ↔ Channel**: Many-to-many contest-to-channel requirements.
- **User ↔ UserChannelSubscription ↔ Channel**: Membership verification per channel.
- **Contest ↔ ContestPrize ↔ Winner**: Prizes are assigned to winners with uniqueness constraints.
- **User ↔ Winner**: One winner record per user per contest.
- **AdminUser ↔ AdminAction**: Admin users generate audit log entries.

## Indexes and constraints

### Users
- `telegramId` is **unique** to prevent duplicate users.
- Indexes on `createdAt` and `isBanned` for admin and fraud operations.

### Referrals
- **Unique** per contest and invitee: `@@unique([contestId, inviteeId])` prevents multiple referrers for the same invitee.
- **Unique** per contest + inviter + invitee: `@@unique([contestId, inviterId, inviteeId])` prevents duplicate referral rows.
- Indexed by `contestId` + `status` for leaderboard queries.

### Contest prizes and winners
- Prize `category` is **unique** per contest for prize categories.
- Prize `rank` is **unique** per contest for ordering.
- Winner has **unique** `contestPrizeId` (one winner per prize).
- Winner has **unique** `[contestId, userId]` (one prize per user per contest).

### Channel membership
- `Channel.key` is **unique** and used to map environment-configured channel IDs/usernames.
- Subscription has **unique** `[userId, channelId]` to prevent duplicate rows.
- ContestChannel is **unique** per contest + channel.

## Pending → Real flow
1. User joins via referral link: create `Referral` with `status = PENDING`.
2. Subscription verification confirms mandatory channels; update `Referral.status = REAL` and set `verifiedAt`.
3. Leaderboards and rewards use `REAL` referrals only.

## Fraud prevention at DB level
- **No duplicate users**: `User.telegramId` unique.
- **No duplicate referrals**: referral uniqueness constraints.
- **No multi-referrer**: invitee unique per contest.
- **No multiple prizes for same user**: winner uniqueness on `[contestId, userId]`.
- **Audit trail**: `AdminAction` retains immutable logs of admin operations.
- **Self-referral check**: enforced with a Postgres CHECK constraint in migrations (e.g. `inviter_id <> invitee_id`).
  Prisma does not support CHECK constraints directly, so this should be added in SQL migration alongside the schema.
