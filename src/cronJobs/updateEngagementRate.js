const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cron = require("node-cron");

// Schedule the job to run every 2 hours (at the start of the hour)
cron.schedule("0 */5 * * *", async () => {
  console.log("Updating analytics data...");

  try {
    // Fetch all users with their pages (views and links fields)
    const users = await prisma.user.findMany({
      include: {
        pages: {
          select: {
            views: true,
            links: true, // JSON field with link objects
          },
        },
      },
    });

    // Loop through each user
    for (const user of users) {
      // Sum up all page views for totalProfileViews
      const totalProfileViews = user.pages.reduce(
        (sum, page) => sum + page.views,
        0
      );

      // Sum up all link clicks across all pages
      let totalLinkClicks = 0;
      for (const page of user.pages) {
        let links;
        try {
          // Parse links JSON, default to empty array if invalid
          links = Array.isArray(page.links)
            ? page.links
            : JSON.parse(page.links || "[]");
          if (!Array.isArray(links)) throw new Error("Links not an array");
        } catch (error) {
          console.error(`Error parsing links for page ${page.id}:`, error);
          links = []; // Fallback to empty array
        }
        // Add up clicks from this page’s links
        const pageLinkClicks = links.reduce(
          (sum, link) => sum + (link.clicks || 0),
          0
        );
        totalLinkClicks += pageLinkClicks;
      }

      // Calculate engagement rate
      const engagementRate =
        totalProfileViews > 0 ? (totalLinkClicks / totalProfileViews) * 100 : 0;

      // Update or create the Analytics record
      await prisma.analytics.upsert({
        where: { userId: user.id },
        update: {
          profileViews: totalProfileViews,
          linkClicks: totalLinkClicks,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          lastUpdated: new Date(),
        },
        create: {
          id: require("crypto").randomUUID(),
          userId: user.id,
          profileViews: totalProfileViews,
          linkClicks: totalLinkClicks,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          lastUpdated: new Date(),
        },
      });
    }

    console.log("Analytics data updated successfully");
  } catch (error) {
    console.error("Error updating analytics data:", error);
  }
});

console.log("Analytics update job scheduled");
