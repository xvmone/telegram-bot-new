import { prisma } from "../db/prisma";
import { env } from "../config/env";

export const getActiveContestId = () => {
  if (!env.activeContestId) {
    throw new Error("ACTIVE_CONTEST_ID_NOT_SET");
  }
  return env.activeContestId;
};

export const createReferralIfNeeded = async (inviterId: string, inviteeId: string) => {
  const contestId = getActiveContestId();

  if (inviterId === inviteeId) {
    return { created: false, referral: null };
  }

  const existing = await prisma.referral.findUnique({
    where: {
      contestId_inviteeId: {
        contestId,
        inviteeId,
      },
    },
  });

  if (existing) {
    return { created: false, referral: existing };
  }

  const referral = await prisma.referral.create({
    data: {
      contestId,
      inviterId,
      inviteeId,
      status: "PENDING",
    },
  });

  return { created: true, referral };
};

export const markReferralReal = async (inviteeId: string) => {
  const contestId = getActiveContestId();

  return prisma.referral.updateMany({
    where: {
      contestId,
      inviteeId,
      status: "PENDING",
    },
    data: {
      status: "REAL",
      verifiedAt: new Date(),
    },
  });
};

export const getInviterForInvitee = async (inviteeId: string) => {
  const contestId = getActiveContestId();

  return prisma.referral.findFirst({
    where: {
      contestId,
      inviteeId,
    },
    include: {
      inviter: true,
    },
  });
};
