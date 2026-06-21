import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface Signature {
  name: string;
  phone?: string;
  timestamp: string;
  ip?: string;
}

export default async (req: Request, context: Context) => {
  const store = getStore("mayyanad-campaign");

  // Handle GET request (Fetch counts or export signatures)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const exportSecret = process.env.EXPORT_SECRET || "admin-export-2026";

    // Secure export of all signatures if secret matches
    if (secretParam && secretParam === exportSecret) {
      const signaturesData = await store.get("signatures", { type: "json" }) as { list?: Signature[] } | null;
      return new Response(JSON.stringify(signaturesData?.list ?? []), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default counts fetch
    const supporterData = await store.get("supporter-count", { type: "json" }) as { count?: number } | null;
    const signaturesData = await store.get("signatures", { type: "json" }) as { list?: Signature[] } | null;
    
    return new Response(JSON.stringify({
      count: supporterData?.count ?? 0,
      signaturesCount: signaturesData?.list?.length ?? 0
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle POST request (Add support click or sign petition)
  if (req.method === "POST") {
    let actionType = "support";
    let name = "";
    let phone = "";

    try {
      const body = await req.json();
      if (body && body.type) {
        actionType = body.type;
        name = body.name || "";
        phone = body.phone || "";
      }
    } catch (e) {
      // Fallback to support click if body is empty or not JSON
      actionType = "support";
    }

    const supporterData = await store.get("supporter-count", { type: "json" }) as { count?: number } | null;
    const currentSupporters = supporterData?.count ?? 0;

    const signaturesData = await store.get("signatures", { type: "json" }) as { list?: Signature[] } | null;
    const signaturesList = signaturesData?.list ?? [];

    if (actionType === "signature") {
      if (!name || name.trim() === "") {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const newSignature: Signature = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        timestamp: new Date().toISOString(),
        ip: req.headers.get("x-nf-client-connection-ip") || undefined
      };

      signaturesList.push(newSignature);
      await store.setJSON("signatures", { list: signaturesList });

      return new Response(JSON.stringify({
        success: true,
        count: currentSupporters,
        signaturesCount: signaturesList.length
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Default: "support" click increment
      const nextSupporters = currentSupporters + 1;
      await store.setJSON("supporter-count", { count: nextSupporters });

      return new Response(JSON.stringify({
        success: true,
        count: nextSupporters,
        signaturesCount: signaturesList.length
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/support",
};
