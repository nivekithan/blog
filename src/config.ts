export const SITE = {
  website: "https://nivekithan.com/", // replace this with your deployed domain
  author: "Nivekithan S",
  profile: "https://github.com/nivekithan",
  desc: "Backend developer sharing insights on Node.js, TypeScript, PostgreSQL, and web development best practices.",
  title: "My Blog",
  lightAndDarkMode: false,
  postPerIndex: 4,
  postPerPage: 4,

  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/nivekithan/blog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Kolkata", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
