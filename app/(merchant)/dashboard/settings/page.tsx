import SettingsClient from "./SettingsClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsClient />;
}
