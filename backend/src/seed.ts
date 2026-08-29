import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth";

/**
 * Ensures a demo login exists so the app is instantly usable without
 * registering. This seed is IDEMPOTENT and NON-DESTRUCTIVE: it never deletes
 * users or data. It only creates the demo account if it's missing, so it's
 * safe to run on every deploy alongside real, persisted user accounts.
 *
 * The demo account starts blank ($0 cash, no positions). Real users register
 * normally and their data persists in Postgres across deploys.
 */
async function main() {
  const email = "demo@launchfinancial.app";
  const password = "password123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo user already exists (${email}) — leaving it and all data untouched.`);
    return;
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

  console.log("Created demo user (blank $0 account):");
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
