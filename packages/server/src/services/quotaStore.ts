import { Firestore } from "@google-cloud/firestore";
import { env } from "../config/env.js";

let db: Firestore | null = null;

function getDb(): Firestore {
  if (db) return db;
  db = new Firestore({
    projectId: env.GOOGLE_CLOUD_PROJECT,
    ignoreUndefinedProperties: true,
  });
  return db;
}

function getJstDateKey(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

const COLLECTION = "daily_quota";
const DOC_PREFIX = "global";

export async function getUsage(): Promise<number> {
  const docId = `${DOC_PREFIX}_${getJstDateKey()}`;
  const doc = await getDb().collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return 0;
  return doc.data()?.count ?? 0;
}

export async function incrementUsage(): Promise<number> {
  const dateKey = getJstDateKey();
  const docId = `${DOC_PREFIX}_${dateKey}`;
  const ref = getDb().collection(COLLECTION).doc(docId);

  return getDb().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? (doc.data()?.count ?? 0) : 0;
    const newCount = current + 1;
    tx.set(ref, { dateKey, count: newCount, updatedAt: new Date().toISOString() });
    return newCount;
  });
}
