import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { amount, orderId, cafeId } = await req.json();

    if (!amount || !orderId || !cafeId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (amount, orderId, cafeId)" },
        { status: 400 }
      );
    }

    const isMockMode = process.env.NEXT_PUBLIC_MOCK_PAYMENTS === "true";

    // 1. Initialize Supabase Admin Client using Service Role Key to read cafe_secrets (bypassing RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      if (isMockMode) {
        return NextResponse.json({
          success: true,
          id: "order_mock_" + Math.random().toString(36).substring(2, 11),
          orderId: "order_mock_" + Math.random().toString(36).substring(2, 11),
          amount: Math.round(amount * 100),
          currency: "INR",
          keyId: "rzp_test_mock",
        });
      }
      throw new Error("Supabase admin credentials are not configured on the server");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch the credentials for the specific cafeId
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from("cafe_secrets")
      .select("razorpay_key_id, razorpay_key_secret")
      .eq("id", cafeId)
      .single();

    if (secretsError || !secrets) {
      if (isMockMode) {
        return NextResponse.json({
          success: true,
          id: "order_mock_" + Math.random().toString(36).substring(2, 11),
          orderId: "order_mock_" + Math.random().toString(36).substring(2, 11),
          amount: Math.round(amount * 100),
          currency: "INR",
          keyId: "rzp_test_mock",
        });
      }
      return NextResponse.json(
        { success: false, error: "Razorpay is not configured for this cafe" },
        { status: 400 }
      );
    }

    const { razorpay_key_id: keyId, razorpay_key_secret: encryptedSecret } = secrets;

    if (!keyId || !encryptedSecret) {
      if (isMockMode) {
        return NextResponse.json({
          success: true,
          id: "order_mock_" + Math.random().toString(36).substring(2, 11),
          orderId: "order_mock_" + Math.random().toString(36).substring(2, 11),
          amount: Math.round(amount * 100),
          currency: "INR",
          keyId: "rzp_test_mock",
        });
      }
      return NextResponse.json(
        { success: false, error: "Razorpay credentials are incomplete for this cafe" },
        { status: 400 }
      );
    }

    // 3. Decrypt the secret key using our Edge-native decrypt utility
    let decryptedSecret;
    try {
      decryptedSecret = await decrypt(encryptedSecret);
    } catch (err) {
      if (isMockMode) {
        return NextResponse.json({
          success: true,
          id: "order_mock_" + Math.random().toString(36).substring(2, 11),
          orderId: "order_mock_" + Math.random().toString(36).substring(2, 11),
          amount: Math.round(amount * 100),
          currency: "INR",
          keyId: "rzp_test_mock",
        });
      }
      throw err;
    }

    // 4. Initialize order via native fetch to Razorpay API (no npm package)
    const authString = btoa(`${keyId}:${decryptedSecret}`);
    const rpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay amount in paise (INR)
        currency: "INR",
        receipt: orderId,
      }),
    });

    if (!rpayResponse.ok) {
      const errorText = await rpayResponse.text();
      console.error("Razorpay API error response:", errorText);
      throw new Error(`Razorpay API responded with status ${rpayResponse.status}: ${errorText}`);
    }

    const rpayData = await rpayResponse.json();

    return NextResponse.json({
      success: true,
      id: rpayData.id,
      orderId: rpayData.id,
      amount: rpayData.amount,
      currency: rpayData.currency,
      keyId: keyId,
    });
  } catch (error: any) {
    console.error("Order Creation Endpoint Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
