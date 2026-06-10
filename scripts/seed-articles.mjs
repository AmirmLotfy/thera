#!/usr/bin/env node
/**
 * Seed published SEO articles into Firestore `articles` collection.
 *
 * Usage (from project root):
 *   FIREBASE_ADMIN_KEY='<service-account-json>' \
 *   node scripts/seed-articles.mjs
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function bootstrap() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) {
    console.error("FIREBASE_ADMIN_KEY env required (paste the Firebase service-account JSON).");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("FIREBASE_ADMIN_KEY is not valid JSON:", err.message);
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID ?? parsed.project_id ?? parsed.projectId,
  });
}

function loadArticles() {
  const json = execSync(
    `npx --yes tsx --eval "import { BLOG_ARTICLES } from './src/lib/blog/articles.ts'; console.log(JSON.stringify(BLOG_ARTICLES))"`,
    { cwd: root, encoding: "utf8" },
  );
  return JSON.parse(json.trim());
}

async function main() {
  bootstrap();
  const db = getFirestore();
  const articles = loadArticles();
  const now = Timestamp.now();

  for (const article of articles) {
    const ref = db.collection("articles").doc(article.id);
    await ref.set(
      {
        ...article,
        status: "published",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    console.log(`Upserted articles/${article.id} (${article.slug})`);
  }

  console.log(`Done — ${articles.length} article(s) seeded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
