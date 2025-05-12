const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const prisma = new PrismaClient();

async function main() {
  // Clear existing data (order matters due to foreign key constraints)
  await prisma.analytics.deleteMany();
  await prisma.link.deleteMany();
  await prisma.page.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  const user1 = await prisma.user.create({
    data: {
      email: "shravankumar@example.com",
      name: "Shravan",
      isSetupComplete: true,
      username: "shravankumar",
      provider: "local",
      displayName: "Shravan Lingampally",
      profilePic:
        "https://asset.cloudinary.com/dfyafvaae/0bc39cca0dd1e2ef60cc9665d5897f12",
      bio: "Developer and cat lover",

      providerId: "local-alice",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "testuser@example.com",
      name: "Test User",
      isSetupComplete: true,
      username: "testuser",
      displayName: "Test User",
      provider: "google",
      profilePic:
        "https://asset.cloudinary.com/dfyafvaae/0bc39cca0dd1e2ef60cc9665d5897f12",
      bio: "Just testing LinkFree!",

    },
  });

  // Seed Pages with nested Link(s) and Analytics
  // Note: Since your schema doesn't include a Template model, we set templateId to null.
  const page1 = await prisma.page.create({
    data: {
      userId: user1.id,
      templateId: null, // No template used
      slug: "shravankumar",
      socialLinks: {
        twitter: "https://twitter.com/shravankumar",
        instagram: "https://instagram.com/shravankumar",
      },
      background: "https://example.com/custom-bg.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
      // Use the relation field names exactly as defined in your schema:
      Link: {
        create: [
          {
            id: uuidv4(),
            title: "Twitter",
            url: "https://twitter.com/shravankumar",
            clicks: 10,
          },
          {
            id: uuidv4(),
            title: "GitHub",
            url: "https://github.com/shravankumar",
            clicks: 5,
          },
        ],
      },
      Analytics: {
        create: {
          id: uuidv4(),
          // No need to supply pageId in the nested create—Prisma sets it automatically
          userId: user1.id,
          profileViews: 150,
          linkClicks: 15,
          engagementRate: 10.0, // (15 / 150) * 100
          lastUpdated: new Date(),
        },
      },
    },
  });

  const page2 = await prisma.page.create({
    data: {
      id: uuidv4(),
      userId: user2.id,
      templateId: null,
      slug: "testuser",
      socialLinks: {
        twitter: "https://twitter.com/testuser",
        instagram: "https://instagram.com/testuser",
      },
      background: "https://example.com/test-bg.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
      Link: {
        create: [
          {
            id: uuidv4(),
            title: "LinkedIn",
            url: "https://linkedin.com/in/testuser",
            clicks: 8,
          },
        ],
      },
      Analytics: {
        create: {
          id: uuidv4(),
          userId: user2.id,
          profileViews: 80,
          linkClicks: 8,
          engagementRate: 10.0, // (8 / 80) * 100
          lastUpdated: new Date(),
        },
      },
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
