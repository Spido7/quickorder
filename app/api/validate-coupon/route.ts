import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { code, merchant_id, cart_subtotal } = await request.json();

    if (!code || !merchant_id || typeof cart_subtotal !== "number") {
      return NextResponse.json(
        { error: "Invalid request payload. 'code', 'merchant_id', and 'cart_subtotal' are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Query coupon matching code and merchant_id case-insensitively
    const { data: coupon, error: fetchError } = await supabase
      .from("coupons")
      .select("*")
      .eq("merchant_id", merchant_id)
      .ilike("code", code.trim())
      .single();

    if (fetchError || !coupon) {
      return NextResponse.json(
        { error: "Invalid coupon code." },
        { status: 400 }
      );
    }

    // Validation checks
    if (!coupon.is_active) {
      return NextResponse.json(
        { error: "This coupon is no longer active." },
        { status: 400 }
      );
    }

    if (coupon.expires_at) {
      const expiry = new Date(coupon.expires_at).getTime();
      if (expiry < Date.now()) {
        return NextResponse.json(
          { error: "This coupon has expired." },
          { status: 400 }
        );
      }
    }

    if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
      return NextResponse.json(
        { error: "This coupon's usage limit has been reached." },
        { status: 400 }
      );
    }

    if (cart_subtotal < Number(coupon.min_order_value)) {
      return NextResponse.json(
        { error: `Minimum order of ₹${Number(coupon.min_order_value).toFixed(2)} required.` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    const discountVal = Number(coupon.discount_value);

    if (coupon.discount_type === "flat") {
      discountAmount = discountVal;
    } else if (coupon.discount_type === "percentage") {
      discountAmount = (cart_subtotal * discountVal) / 100;
      if (coupon.max_discount_amount !== null) {
        const maxDiscount = Number(coupon.max_discount_amount);
        if (discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
      }
    }

    // Cap discount at the subtotal
    if (discountAmount > cart_subtotal) {
      discountAmount = cart_subtotal;
    }

    // Keep it to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      discount_amount: discountAmount,
      message: "Coupon applied successfully!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
