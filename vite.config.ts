/**
 * Vite config + the tiny same-origin narration bridge (R2.3, R4.1).
 *
 * `POST /api/narrate {features}` runs the deterministic classifier server-side (model/threatCall)
 * and asks Bedrock Nova to narrate the result; with no AWS creds (or any failure) it returns the
 * offline deterministic template instead. Bedrock is OFF the kill chain — it only narrates; the
 * classification is computed by `classify` and returned verbatim so the client can verify it was
 * never altered. Same-origin middleware keeps the page CSP-safe (no CDN/cross-origin calls).
 */
import { defineConfig, type Plugin } from "vite";
import { classify, explainTemplate, type TrackFeatures } from "./src/model/threatCall";
import { narrate, hasCreds } from "./bridge/bedrock.mjs";

function narrationBridge(): Plugin {
  return {
    name: "aegis-narration-bridge",
    configureServer(server) {
      server.middlewares.use("/api/narrate", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("POST only");
        }
        let raw = "";
        req.on("data", (c) => {
          raw += c;
          if (raw.length > 1e5) req.destroy(); // guard
        });
        req.on("end", async () => {
          const reply = (obj: unknown) => {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(obj));
          };
          let features: TrackFeatures;
          try {
            features = JSON.parse(raw).features;
            if (!features || typeof features.trackId !== "string") throw new Error("bad features");
          } catch {
            res.statusCode = 400;
            return reply({ error: "expected { features: TrackFeatures }" });
          }
          // Deterministic call ON the decision path — re-run the real classifier server-side.
          const k = classify(features);
          // Bedrock narration OFF the path; offline template is the always-available fallback.
          if (hasCreds()) {
            try {
              const text = await narrate(k);
              return reply({ source: "bedrock", text, classification: k });
            } catch (e) {
              return reply({ source: "offline", text: explainTemplate(k), classification: k, note: String((e as Error).message).slice(0, 120) });
            }
          }
          return reply({ source: "offline", text: explainTemplate(k), classification: k });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [narrationBridge()],
  server: {
    host: true,
    // Allow access via tunnel hostnames (cloudflared public links).
    allowedHosts: true,
  },
});
