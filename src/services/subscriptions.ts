import type { Telegram } from "telegraf";

import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { getInviterForInvitee, markReferralReal } from "./referrals";
import { notifyInviter } from "./notifications";

const normalizeChannelId = (value: string) => {
  if (value.startsWith("@")) {
    return value;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return numeric;
};

const isMemberStatus = (status?: string) => {
  return status === "member" || status === "administrator" || status === "creator";
};

export const checkMandatorySubscriptions = async (
  telegram: Telegram,
  telegramUserId: number,
) => {
  const channels = env.mandatoryChannels;
  if (channels.length === 0) {
    return true;
  }

  const results = await Promise.all(
    channels.map(async (channel) => {
      const chatId = normalizeChannelId(channel);
      const member = await telegram.getChatMember(chatId, telegramUserId);
      return isMemberStatus(member.status);
    }),
  );

  return results.every(Boolean);
};

export const syncChannelSubscriptions = async (
  telegram: Telegram,
  telegramUserId: number,
) => {
  const channels = env.mandatoryChannels;
  if (channels.length === 0) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramUserId) },
  });

  if (!user) {
    return;
  }

  await Promise.all(
    channels.map(async (channel) => {
      const chatId = normalizeChannelId(channel);
      const member = await telegram.getChatMember(chatId, telegramUserId);
      const isMember = isMemberStatus(member.status);

      const channelRecord = await prisma.channel.upsert({
        where: { key: channel },
        create: {
          key: channel,
          telegramChannelId: typeof chatId === "number" ? BigInt(chatId) : null,
          username: channel.startsWith("@") ? channel.slice(1) : null,
          title: member.chat?.title ?? null,
        },
        update: {
          telegramChannelId: typeof chatId === "number" ? BigInt(chatId) : null,
          username: channel.startsWith("@") ? channel.slice(1) : null,
          title: member.chat?.title ?? null,
        },
      });

      await prisma.userChannelSubscription.upsert({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channelRecord.id,
          },
        },
        create: {
          userId: user.id,
          channelId: channelRecord.id,
          isMember,
          verifiedAt: isMember ? new Date() : null,
        },
        update: {
          isMember,
          verifiedAt: isMember ? new Date() : null,
        },
      });
    }),
  );
};

export const verifyAndFinalizeReferral = async (
  telegram: Telegram,
  telegramUserId: number,
) => {
  const isSubscribed = await checkMandatorySubscriptions(telegram, telegramUserId);
  if (!isSubscribed) {
    return { updated: false };
  }

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramUserId) },
  });

  if (!user || user.isBanned) {
    return { updated: false };
  }

  await syncChannelSubscriptions(telegram, telegramUserId);
  const updateResult = await markReferralReal(user.id);

  if (updateResult.count > 0) {
    const referral = await getInviterForInvitee(user.id);
    if (referral?.inviter) {
      await notifyInviter(telegram, referral.inviter.telegramId, user);
    }
    return { updated: true };
  }

  return { updated: false };
};
