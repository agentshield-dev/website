import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import matter from "gray-matter";

export type BlogAnnouncement = {
  href: string;
  publishedAt: number;
  title: string;
};

const postsDirectory = join(process.cwd(), "blog/content/posts");

function isAnnouncementCategory(value: unknown) {
  const categories = Array.isArray(value) ? value : [value];

  return categories.some(
    (category) =>
      typeof category === "string" && category.toLowerCase() === "announcement",
  );
}

function parsePostDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// The newest published post in the Announcement category. Drafts and future-dated posts are ignored.
export async function getLatestAnnouncement(): Promise<BlogAnnouncement | null> {
  const filenames = await readdir(postsDirectory);
  const now = Date.now();
  const announcements = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".md") && filename !== "_index.md")
      .map(async (filename) => {
        const source = await readFile(join(postsDirectory, filename), "utf8");
        const { data } = matter(source);
        const date = parsePostDate(data.date);

        if (
          data.draft === true ||
          !date ||
          date.getTime() > now ||
          typeof data.title !== "string" ||
          !isAnnouncementCategory(data.categories)
        ) {
          return null;
        }

        const customSlug = typeof data.slug === "string" ? data.slug.trim() : "";
        const slug = customSlug || basename(filename, extname(filename));
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");

        return {
          href: `/blog/${year}/${month}/${slug}/`,
          publishedAt: date.getTime(),
          title: data.title,
        };
      }),
  );

  return (
    announcements
      .filter(
        (announcement): announcement is BlogAnnouncement => announcement !== null,
      )
      .sort((first, second) => second.publishedAt - first.publishedAt)[0] ?? null
  );
}
