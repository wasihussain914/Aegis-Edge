/**
 * Tiny Bedrock (Nova) narration bridge — Node ESM, ZERO npm dependencies.
 *
 * OFF the kill chain: this only turns an already-computed classification + its logged
 * contributions into a plain-language paragraph. It NEVER classifies and NEVER changes the
 * threat call. If AWS creds are absent or the call fails, callers fall back to the offline
 * deterministic template — so the demo always works disconnected.
 *
 * Self-contained AWS SigV4 (node:crypto) so we don't pull the AWS SDK into a CSP-safe repo.
 */
import { createHash, createHmac } from "node:crypto";

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

export function hasCreds() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

/** Build the operator-facing narration prompt from the classifier's logged result. */
function buildPrompt(k) {
  const drivers = (k.contributions || [])
    .map((c) => `  - ${c.feature} (${c.weight > 0 ? "+" : ""}${c.weight}): ${c.note}`)
    .join("\n");
  return (
    "You are the explanation layer for a counter-UAS edge classifier at a base defense " +
    "operations center. A deterministic, LLM-free model has ALREADY made the call below. " +
    "Write 2-3 tight sentences for the battle captain explaining WHY this track got this " +
    "assessment, grounded ONLY in the listed evidence. Do not re-judge, hedge, or invent " +
    "data. Do not recommend a specific kinetic action; defeat is human-gated.\n\n" +
    `Track ${k.trackId}: class=${k.class}, threat=${k.threat}, score=${k.score}.\n` +
    `Evidence (feature, weight, note):\n${drivers || "  - (no positive indicators)"}\n`
  );
}

/**
 * Narrate a classification via Bedrock Nova. Returns the narration string, or throws on any
 * failure (no creds, network, throttle) so the caller can fall back to the offline template.
 */
export async function narrate(k, opts = {}) {
  if (!hasCreds()) throw new Error("no-aws-creds");
  const region = opts.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const modelId = opts.modelId || process.env.AEGIS_BEDROCK_MODEL || "us.amazon.nova-lite-v1:0";
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  // The wire path single-encodes the model id (colon -> %3A); SigV4's canonical URI encodes the
  // path AGAIN (so %3A -> %253A). Sending one and signing the other is the classic 403 here.
  const path = `/model/${enc(modelId)}/invoke`;
  const canonicalUri = path.split("/").map(enc).join("/");

  const body = JSON.stringify({
    messages: [{ role: "user", content: [{ text: buildPrompt(k) }] }],
    inferenceConfig: { maxTokens: 220, temperature: 0.2, topP: 0.9 },
  });

  // --- SigV4 ---
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const service = "bedrock";
  const token = process.env.AWS_SESSION_TOKEN;
  const payloadHash = sha256hex(body);

  const headers = {
    "content-type": "application/json",
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(token ? { "x-amz-security-token": token } : {}),
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join("");
  const canonicalRequest = ["POST", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");

  const kDate = hmac("AWS4" + process.env.AWS_SECRET_ACCESS_KEY, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs || 8000);
  try {
    const res = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: { ...headers, Authorization: authorization },
      body,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`bedrock ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const text = data?.output?.message?.content?.map((c) => c.text).join(" ").trim();
    if (!text) throw new Error("bedrock empty response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
