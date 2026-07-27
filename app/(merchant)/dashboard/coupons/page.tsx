import CouponsClient from "./CouponsClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function CouponsPage() {
  return <CouponsClient />;
}
