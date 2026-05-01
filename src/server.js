import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

// Health check endpoint
app.get("/__health", (_req, res) => {
  res.json({ status: "ok", target: TARGET_BASE || "NOT SET" });
});

// Relay all other requests
app.all("*", async (req, res) => {
  if (!TARGET_BASE) {
    return res.status(500).send("Misconfigured: TARGET_DOMAIN is not set");
  }

  try {
    const targetUrl = TARGET_BASE + req.url;

    const outHeaders = new Headers();
    let clientIp = null;

    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (STRIP_HEADERS.has(key)) continue;
      if (key === "x-real-ip") {
        clientIp = v;
        continue;
      }
      if (key === "x-forwarded-for") {
        if (!clientIp) clientIp = v;
        continue;
      }
      outHeaders.set(k, v);
    }

    if (clientIp) outHeaders.set("x-forwarded-for", clientIp);

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    // Stream request body directly to upstream
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: outHeaders,
      body: hasBody ? req : undefined,
      duplex: "half",
      redirect: "manual",
    });

    // Forward status and headers back to client
    res.status(upstreamRes.status);
    for (const [k, v] of upstreamRes.headers) {
      const key = k.toLowerCase();
      if (key === "transfer-encoding") continue; // Express handles this
      res.setHeader(k, v);
    }

    // Stream response body back
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const canContinue = res.write(value);
          if (!canContinue) {
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err) {
    console.error("relay error:", err);
    if (!res.headersSent) {
      res.status(502).send("Bad Gateway: Tunnel Failed");
    }
  }
});

app.listen(PORT, () => {
  console.log(`XHTTP relay listening on port ${PORT}`);
  console.log(`Target: ${TARGET_BASE || "â ï¸  TARGET_DOMAIN not set"}`);
});
