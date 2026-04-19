import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "@/lib/firebase.server";

const BASE = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.wethera.site";

const STATIC_PATHS = [
  "/", "/about", "/how-it-works", "/therapists", "/blog",
  "/faq", "/contact", "/privacy", "/terms",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: string[] = [];
        for (const p of STATIC_PATHS) {
          urls.push(entry(`${BASE}${p}`, ["en", "ar"]));
        }
        try {
          const db = adminDb();
          if (db) {
            const articles = await db.collection("articles").where("status", "==", "published").get();
            articles.forEach((d) => urls.push(entry(`${BASE}/blog/${(d.data() as { slug?: string }).slug ?? d.id}`, ["en", "ar"])));
            const therapists = await db.collection("therapists").where("approved", "==", true).get();
            therapists.forEach((d) => urls.push(entry(`${BASE}/therapists/${d.id}`, ["en", "ar"])));
          }
        } catch {
          /* ignore in demo mode */
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=3600",
          },
        });
      },
    },
  },
});

function entry(loc: string, langs: string[]): string {
  const alt = langs.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${loc}" />`).join("");
  return `<url><loc>${loc}</loc>${alt}<xhtml:link rel="alternate" hreflang="x-default" href="${loc}" /></url>`;
}
