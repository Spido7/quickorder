import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";

export const runtime = "edge";

async function verifySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(`${razorpayOrderId}|${razorpayPaymentId}`);

  // Import the secret key for HMAC SHA-256
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data as any);
  const signatureArray = new Uint8Array(signatureBuffer);

  // Convert signature to hex string
  let expectedHex = "";
  for (let i = 0; i < signatureArray.length; i++) {
    expectedHex += signatureArray[i].toString(16).padStart(2, "0");
  }

  return expectedHex === signature;
}

export async function POST(req: Request) {
  try {
    const {
      cafeId,
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId ||
      !cafeId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required verification fields" },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase Admin Client using Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase admin credentials are not configured on the server");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch the cafe secrets to get key_secret
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from("cafe_secrets")
      .select("razorpay_key_secret")
      .eq("id", cafeId)
      .single();

    if (secretsError || !secrets || !secrets.razorpay_key_secret) {
      return NextResponse.json(
        { success: false, error: "Razorpay keys not found for verification" },
        { status: 400 }
      );
    }

    // 3. Decrypt the secret key
    const decryptedSecret = await decrypt(secrets.razorpay_key_secret);

    // 4. Verify signature via Web Crypto API (HMAC SHA-256)
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      decryptedSecret
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Cryptographic signature mismatch" },
        { status: 400 }
      );
    }

    // 5. Update order status to "preparing" and payment_status to "paid"
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: "preparing",
        payment_status: "paid",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Supabase order update error:", updateError);
      throw new Error("Failed to update order status in database");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Signature Verification Endpoint Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
