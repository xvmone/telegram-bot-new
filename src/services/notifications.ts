import type { Telegram } from "telegraf";

import type { User } from "@prisma/client";

export const notifyInviter = async (
  telegram: Telegram,
  inviterTelegramId: bigint,
  invitee: User,
) => {
  const inviteeLabel = invitee.username
    ? `@${invitee.username}`
    : invitee.displayName || "A new user";

  await telegram.sendMessage(
    Number(inviterTelegramId),
    `🎉 Your referral ${inviteeLabel} has joined and subscribed to all channels!`,
  );
};
