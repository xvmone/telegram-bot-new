import type { User as TelegramUser } from "telegraf/types";

import { prisma } from "../db/prisma";

export const upsertTelegramUser = async (telegramUser: TelegramUser) => {
  const displayName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return prisma.user.upsert({
    where: { telegramId: BigInt(telegramUser.id) },
    create: {
      telegramId: BigInt(telegramUser.id),
      username: telegramUser.username ?? null,
      displayName: displayName || null,
    },
    update: {
      username: telegramUser.username ?? null,
      displayName: displayName || null,
    },
  });
};

export const ensureNotBanned = (user: { isBanned: boolean }) => {
  if (user.isBanned) {
    throw new Error("USER_BANNED");
  }
};
