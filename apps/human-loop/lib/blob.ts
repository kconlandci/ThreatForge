import { put, list } from "@vercel/blob";

const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveJson(pathPrefix: string, id: string, data: unknown) {
  if (!hasBlobToken) return { skipped: true };
  const key = `${pathPrefix}/${id}.json`;
  await put(key, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return { skipped: false, key };
}

export async function listJson<T>(pathPrefix: string): Promise<T[]> {
  if (!hasBlobToken) return [];
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: `${pathPrefix}/`, cursor, limit: 1000 });
    const fetched = await Promise.all(
      res.blobs.map(async (b) => {
        try {
          const r = await fetch(b.url, { cache: "no-store" });
          if (!r.ok) return null;
          return (await r.json()) as T;
        } catch {
          return null;
        }
      })
    );
    for (const item of fetched) if (item) out.push(item);
    cursor = res.cursor;
  } while (cursor);
  return out;
}
