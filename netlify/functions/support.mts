import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const store = getStore("mayyanad-campaign");

  if (req.method === "GET") {
    const data = await store.get("supporter-count", { type: "json" });
    const count = data?.count ?? 0;
    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const data = await store.get("supporter-count", { type: "json" });
    const current = data?.count ?? 0;
    const next = current + 1;
    await store.setJSON("supporter-count", { count: next });
    return new Response(JSON.stringify({ count: next }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/support",
};
