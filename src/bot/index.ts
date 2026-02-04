import { Telegraf } from "telegraf";

import { env } from "../config/env";
import { startHandler } from "../handlers/start";
import { verifyAndFinalizeReferral } from "../services/subscriptions";
import { upsertTelegramUser } from "../services/users";

export const createBot = () => {
  if (!env.botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN_NOT_SET");
  }

  const bot = new Telegraf(env.botToken);

  bot.start(startHandler);

  bot.on("chat_member", async (ctx) => {
    const update = ctx.update.chat_member;
    const member = update.new_chat_member?.user;

    if (!member) {
      return;
    }

    await upsertTelegramUser(member);
    await verifyAndFinalizeReferral(ctx.telegram, member.id);
  });

  return bot;
};
