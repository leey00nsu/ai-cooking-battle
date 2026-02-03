import { prisma } from "@/lib/prisma";

const GUEST_USER_ID = "guest";

export async function getGuestUserId() {
  await prisma.user.upsert({
    where: { id: GUEST_USER_ID },
    update: {},
    create: {
      id: GUEST_USER_ID,
      name: "Guest",
    },
  });

  return GUEST_USER_ID;
}
