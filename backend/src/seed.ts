import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth";

/**
 * Seeds a single demo login so the app is instantly usable without registering.
 *
 * The account starts completely blank: $0 cash, no positions, no watchlist,
 * no learning progress. Users add whatever funds they want from the "Move
 * money" page, and every deposit is tracked as a transaction.
 */
async function main() {
  const email = "demo@wealthsimple.dev";
  const password = "password123";

  // Clean slate for the demo user.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Demo",
      lastName: "Investor",
      // A single, empty Personal account starting at $0 — same as a brand-new signup.
      accounts: {
        create: [{ type: "PERSONAL", name: "Personal", cashBalance: 0 }],
      },
    },
  });

  console.log("Seeded demo user (blank $0 account):");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
