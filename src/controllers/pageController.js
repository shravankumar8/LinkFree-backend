// controllers/booksController.js
const { provider } = require("@prisma/client");
const bcrypt = require("bcrypt");
const PrismaClient = require("@prisma/client").PrismaClient;
const jwt = require("jsonwebtoken");
const passport = require("passport");
const prisma = new PrismaClient();

exports.getAllPages = async (req, res, next) => {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const pages = await prisma.page.findMany({
      where: {
        userId: userId,
      },
    });

    res.status(200).json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching pages" });
  }
};

exports.changeVisibility = async (req, res) => {
  const { id, visibility } = req.body;
  const userId = req.user?.id;
  console.log("Visibility change request:", req.body);

  try {
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        errors: ["No user ID found"],
      });
    }
    if (!id) {
      return res.status(400).json({
        message: "Missing required field",
        errors: ["Page ID is required"],
      });
    }
    if (typeof visibility !== "boolean") {
      return res.status(400).json({
        message: "Invalid input",
        errors: ["Visibility must be a boolean value"],
      });
    }
    const page = await prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
        errors: ["The specified page does not exist"],
      });
    }
    if (page.userId !== userId) {
      return res.status(403).json({
        message: "Forbidden",
        errors: ["You do not have permission to modify this page"],
      });
    }
    const updatedPage = await prisma.page.update({
      where: { id },
      data: { visibility },
      select: {
        id: true,
        slug: true,
        visibility: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "Page visibility updated successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Error updating page visibility:", error);
    res.status(500).json({
      message: "Internal server error",
      errors: ["Failed to update page visibility"],
    });
  }
};

exports.getpage = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!userId || !id) {
    return res.status(400).json({ error: "Missing user ID or page ID" });
  }

  try {
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            isSetupComplete: true,
            displayName: true,
            profilePic: true,
            bio: true,
          },
        },

        // Correct as-isZ
        // Include analytics for the page
      },
    });

    if (!page || page.userId !== userId) {
      return res.status(404).json({ error: "Page not found or unauthorized" });
    }

    // Transform socialLinks from JSON to array format for frontend compatibility
    const socialLinksArray = page.socialLinks
      ? Object.entries(page.socialLinks).map(([platform, url], idx) => ({
          id: idx + 1,
          platform,
          url: url || "",
          // Default to enabled; frontend can toggle
        }))
      : [];

    res.status(200).json({
      ...page,
      socialLinks: socialLinksArray,
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
};

exports.createPageinfo = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(400).json({ error: "Missing user ID" });
  }

  try {
    // how many pages this user already has
    const pageCount = await prisma.page.count({ where: { userId } });
    const isDefault = pageCount === 0;

    // grab the user’s core info
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        isSetupComplete: true,
        displayName: true,
        profilePic: true,
        bio: true,
      },
    });

    if (!userInfo) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      ...userInfo,
      isDefault,
    });
  } catch (error) {
    console.error("Error fetching page info:", error);
    return res.status(500).json({ error: "Failed to fetch page info" });
  }
};

const hasChanged = (newValue, oldValue) => {
  if (newValue === null || newValue === undefined) {
    return oldValue !== null && oldValue !== undefined;
  }
  if (oldValue === null || oldValue === undefined) {
    return true;
  }
  return JSON.stringify(newValue) !== JSON.stringify(oldValue);
};

exports.createPage = async (req, res) => {
  const { slug, bio, socialLinks, background, visibility, links } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(400).json({ error: "Missing userId in request body" });
    }
    if (!slug) {
      return res.status(400).xjson({ error: "Slug is required" });
    }

    const sanitizedSlug = slug.trim();
    const sanitizedBio = bio ? bio.trim() : "";
    const existingPage = await prisma.page.findUnique({
      where: {
        slug: sanitizedSlug,
      },
    });

    if (existingPage) {
      return res.status(400).json({ error: "Slug already in use" });
    }

    const userPages = await prisma.page.findMany({
      where: {
        userId: userId,
      },
    });
    const isDefault = userPages.length === 0;

    let socialLinksObject = {};
    if (Array.isArray(socialLinks)) {
      socialLinksObject = socialLinks.reduce((acc, link) => {
        if (link.platform && link.url) {
          acc[link.platform] = link.url.trim();
        }
        return acc;
      }, {});
    } else if (socialLinks) {
      return res.status(400).json({ error: "socialLinks muust be an Array" });
    }

    let validatedLinks = [];

    if (Array.isArray(links)) {
      validatedLinks = links.map((link) => ({
        title: link.title ? link.title.trim() : "",
        url: link.url ? link.url.trim() : "#",
        clicks: typeof link.clicks === "number" ? link.clicks : 0,
      }));
    } else if (links) {
      return res.status(400).json({ error: "links must be an Array" });
    }

    const newPage = await prisma.page.create({
      data: {
        isDefault,
        slug: sanitizedSlug,
        bio: sanitizedBio || null,
        socialLinks: socialLinksObject,
        background: background ? background.trim() : null,
        visibility: visibility !== undefined ? visibility : true,
        links: validatedLinks,
        user: {
          connect: { id: userId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isSetupComplete: true,
            displayName: true,
            profilePic: true,
            bio: true,
          },
        },
      },
    });

    const socialLinksArray = newPage.socialLinks
      ? Object.entries(newPage.socialLinks).map(([platform, url], idx) => ({
          id: idx + 1, // Simple incremental ID for response
          platform,
          url,
        }))
      : [];

    const response = {
      ...newPage,
      socialLinks: socialLinksArray,
      links: newPage.links || [],
      totalViews: newPage.Analytics?.[0]?.profileViews || 0,
      linkClicks: newPage.Analytics?.[0]?.linkClicks || 0,
    };

    res.status(201).json(response);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Database constraint violation" });
    }
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
};

exports.updatePage = async (req, res) => {
  const { id } = req.params;
  const { bio, links, socialLinks, background } = req.body;
  const userId = req.user.id;

  //  const userId = req.user.id;
  try {
    if (!id) {
      return res.status(400).json({ error: "Page id  is required" });
    }
    const currentPage = await prisma.page.findUnique({
      where: { id },
    });
    if (!currentPage) {
      return res.status(404).json({ error: "Page not found" });
    }
    if (currentPage.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this page" });
    }
    const dataToUpdate = {};

    if (bio != undefined && hasChanged(bio, currentPage.bio)) {
      dataToUpdate.bio = bio;
    }

    if (
      background !== undefined &&
      hasChanged(background, currentPage.background)
    ) {
      dataToUpdate.background = background;
    }

    let socialLinksForDb = currentPage.socialLinks || {};
    if (socialLinks !== undefined) {
      const newSocialLinks = socialLinks.reduce((acc, link) => {
        acc[link.platform] = link.url;

        return acc;
      }, {});

      if (hasChanged(newSocialLinks, currentPage.socialLinks)) {
        dataToUpdate.socialLinks = newSocialLinks;
      }
    }

    if (links !== undefined && hasChanged(links, currentPage.links)) {
      // Ensure links are in the correct format
      dataToUpdate.links = links.map((link) => ({
        title: link.title || "",
        url: link.url || "#",
        clicks: link.clicks || 0,
      }));
    }

    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updatedAt = new Date(); // Update timestamp only if there’s a change

      const updatedPage = await prisma.page.update({
        where: { id },
        data: dataToUpdate,
        include: {
          user: true,
        },
      });

      // Format the response for the frontend
      const socialLinksArray = updatedPage.socialLinks
        ? Object.entries(updatedPage.socialLinks).map(
            ([platform, url], idx) => ({
              platform,
              url,
            })
          )
        : [];

      const response = {
        ...updatedPage,
        Links: updatedPage.links || [],
        socialLinks: socialLinksArray,
        totalViews: updatedPage.Analytics?.[0]?.profileViews || 0,
        linkClicks: updatedPage.Analytics?.[0]?.linkClicks || 0,
      };

      return res.status(200).json(response);
    }

    // If no changes, return the current page formatted for the frontend
    const socialLinksArray = currentPage.socialLinks
      ? Object.entries(currentPage.socialLinks).map(([platform, url], idx) => ({
          id: idx + 1,
          platform,
          url,
          enabled: true,
        }))
      : [];

    const formattedPage = {
      ...currentPage,
      Links: currentPage.links || [],
      socialLinks: socialLinksArray,
      totalViews: currentPage.Analytics?.[0]?.profileViews || 0,
      linkClicks: currentPage.Analytics?.[0]?.linkClicks || 0,
    };

    res.status(200).json(formattedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ error: "Failed to update page" });
  }
};
