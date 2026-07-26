// Edge-native encryption utilities using Web Crypto API (AES-GCM-256)
// This file is fully compatible with Cloudflare Workers / Next.js Edge runtime.
// It does NOT import Node.js 'crypto' to prevent large polyfill injection.

const IV_LENGTH = 12; // 12 bytes is standard for AES-GCM

function getEnvKey(): string {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PAYMENT_ENCRYPTION_KEY is not defined in environment variables");
  }
  return key;
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const array = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return array;
}

// Convert Uint8Array to hex string
function uint8ArrayToHex(arr: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Helper to import the raw master key
async function importKey(): Promise<CryptoKey> {
  const rawKeyHex = getEnvKey();
  const rawKey = hexToUint8Array(rawKeyHex);

  return await crypto.subtle.importKey(
    "raw",
    rawKey as any,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts plain text using AES-GCM-256 with a random IV
 * Returns a hex-encoded string containing both IV and ciphertext
 */
export async function encrypt(text: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    encodedText as any
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  // Combine IV and Ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  return uint8ArrayToHex(combined);
}

/**
 * Decrypts a hex-encoded AES-GCM-256 ciphertext string
 */
export async function decrypt(encryptedHex: string): Promise<string> {
  const key = await importKey();
  const combined = hexToUint8Array(encryptedHex);

  if (combined.length < IV_LENGTH) {
    throw new Error("Invalid encrypted text length");
  }

  // Split IV and Ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    ciphertext as any
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
