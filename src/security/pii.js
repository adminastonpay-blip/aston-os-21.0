const PATTERNS = [
  { kind: "email", regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { kind: "api_key", regex: /\b(?:sk|pk|ghp|xoxb)_[A-Za-z0-9_-]{20,}\b/g },
  { kind: "iban", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { kind: "card_candidate", regex: /\b(?:\d[ -]?){13,19}\b/g }
];

async function tokenFor(value, kind, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(kind + ":" + value));
  const hex = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
  return "[[" + kind.toUpperCase() + "_" + hex.slice(0, 20) + "]]";
}

export async function tokenizeSensitiveText(input, secret) {
  if (typeof input !== "string") throw new TypeError("input_must_be_text");
  if (typeof secret !== "string" || secret.length < 32) throw new TypeError("strong_hmac_secret_required");
  let masked = input;
  const replacements = new Map();
  for (const pattern of PATTERNS) {
    const matches = [...input.matchAll(pattern.regex)];
    for (const match of matches) {
      const value = match[0];
      if (pattern.kind === "card_candidate" && !passesLuhn(value)) continue;
      const token = await tokenFor(value, pattern.kind, secret);
      replacements.set(token, value);
      masked = masked.replaceAll(value, token);
    }
  }
  return { masked, tokenCount: replacements.size, replacements };
}

function passesLuhn(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

// Pattern-based masking is a convenience layer, not a complete DLP or compliance control.
