import type { Context } from "telegraf";

import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { upsertTelegramUser } from "../services/users";
import { createReferralIfNeeded } from "../services/referrals";
import { verifyAndFinalizeReferral } from "../services/subscriptions";

const parseReferralPayload = (payload?: string) => {
  if (!payload) {
    return null;
  }
  const match = payload.match(/^ref_(\d+)$/);
  if (!match) {
    return null;
  }
  return match[1];
};

export const startHandler = async (ctx: Context) => {
  if (!ctx.from) {
    return;
  }

  const user = await upsertTelegramUser(ctx.from);
  if (user.isBanned) {
    await ctx.reply("Your account is restricted. Contact support if you believe this is a mistake.");
    return;
  }

  const payload = "startPayload" in ctx ? ctx.startPayload : undefined;
  const inviterTelegramId = parseReferralPayload(payload);

  if (!env.activeContestId) {
    await ctx.reply("Contest setup is incomplete. Please try again later.");
    return;
  }

  if (inviterTelegramId && inviterTelegramId !== String(ctx.from.id)) {
    const inviter = await prisma.user.findUnique({
      where: { telegramId: BigInt(inviterTelegramId) },
    });

    if (inviter && !inviter.isBanned) {
      await createReferralIfNeeded(inviter.id, user.id);
    }
  }

  const verified = await verifyAndFinalizeReferral(ctx.telegram, ctx.from.id);

  if (!verified.updated) {
    const channels = env.mandatoryChannels.length > 0
      ? `\n\nPlease subscribe to: ${env.mandatoryChannels.join(", ")}`
      : "";
    await ctx.reply(
      `Welcome! Complete the required subscriptions to activate your referral.${channels}`,
    );
    return;
  }

  await ctx.reply("Welcome! Your referral is confirmed.");
};
