// controllers/booksController.js
const { provider } = require("@prisma/client");
const bcrypt = require("bcrypt");
const PrismaClient = require("@prisma/client").PrismaClient;
const jwt = require("jsonwebtoken");
const passport = require("passport");
const prisma = new PrismaClient();


exports.getPortfolio = async (req, res) => {

  const { username, slug } = req.params;
  try {
     const user = await prisma.user.findUnique({
       where: { username },
       select: {
         id: true,
         username: true,
         displayName: true,
         profilePic: true,
         bio: true,
         pages: {
           select: {
             id: true,
             isDefault: true,
             slug: true,
             bio: true,
             socialLinks: true,
             links: true,
             background: true,
             visibility: true,
             views: true,
             createdAt: true,
             updatedAt: true,
           },
         },
       },
     });


    if (!user) {
      return res.status(404).json({
        message: "User not found",
        errors: ["User does not exist"],
      });
    }


     let page;
     if (slug) {
       // Custom page: look for a page with matching slug
       page = user.pages.find((p) => p.slug === slug && p.visibility);
       if (!page) {
         return res.status(404).json({
           message: "Page not found",
           errors: ["The specified page does not exist or is not visible"],
         });
       }
     } else {
       // Default page: look for isDefault: true
       page = user.pages.find((p) => p.isDefault && p.visibility);
       if (!page) {
         return res.status(404).json({
           message: "Default page not found",
           errors: ["No visible default page found for this user"],
         });
       }
     }

await prisma.page.update({
  where: { id: page.id },
  data: {
    views: {
      increment: 1, // Increment the views by 1
    },
  },
});
    
   
    const response = {
      message: "Portfolio page retrieved successfully",
      data: {
        username: user.username,
        displayName: user.displayName,
        profilePic: user.profilePic,
        userBio: user.bio,
        pageBio: page.bio,
        background: page.background,
        socialLinks: page.socialLinks,
        links: page.links,
        visibility: page.visibility,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        totalViews: page.views + 1, // Reflect the incremented value in the response
      },
    };
res.status(200).json(response);
  } catch (error) {
     console.error('Error fetching portfolio page:', error);
    res.status(500).json({
      message: 'Internal server error',
      errors: ['Failed to fetch portfolio page'],
    });
  }


}


exports.trackLinkClick = async (req, res) => {
  const { username, slug } = req.params;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      message: "Missing required field",
      errors: ["Link URL is required"],
    });
  }

  try {
    // Find the user and their pages
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        pages: {
          select: {
            id: true,
            isDefault: true,
            slug: true,
            links: true,
            visibility: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        errors: ["User does not exist"],
      });
    }

    // Find the page (default or custom)
    let page;
    if (slug) {
      page = user.pages.find((p) => p.slug === slug && p.visibility);
      if (!page) {
        return res.status(404).json({
          message: "Page not found",
          errors: ["The specified page does not exist or is not visible"],
        });
      }
    } else {
      page = user.pages.find((p) => p.isDefault && p.visibility);
      if (!page) {
        return res.status(404).json({
          message: "Default page not found",
          errors: ["No visible default page found for this user"],
        });
      }
    }

    // Parse the links array
    const links = Array.isArray(page.links)
      ? page.links
      : JSON.parse(page.links || "[]");

    // Find the link to update
    const linkIndex = links.findIndex((link) => link.url === url);
    if (linkIndex === -1) {
      return res.status(404).json({
        message: "Link not found",
        errors: ["The specified link does not exist on this page"],
      });
    }

    // Increment the clicks count
    links[linkIndex].clicks = (links[linkIndex].clicks || 0) + 1;

    // Update the page in the database
    await prisma.page.update({
      where: { id: page.id },
      data: {
        links: links, // Update the entire links array
      },
    });

    // Invalidate the cache for this page


    res.status(200).json({
      message: "Link click tracked successfully",
      data: { url, clicks: links[linkIndex].clicks },
    });
  } catch (error) {
    console.error("Error tracking link click:", error);
    res.status(500).json({
      message: "Internal server error",
      errors: ["Failed to track link click"],
    });
  }
};