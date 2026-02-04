export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  activeContestId: process.env.ACTIVE_CONTEST_ID ?? "",
  mandatoryChannels: (process.env.MANDATORY_CHANNELS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === "production";
