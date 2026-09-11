import Dashboard from "./dashboard";
import { requireChatGPTUser } from "./chatgpt-auth";
import { getPreferences, listResources } from "@/db/resources";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const [resources, preferences] = await Promise.all([
    listResources(user.userId),
    getPreferences(user.userId),
  ]);
  return <Dashboard initialResources={resources} initialPreferences={preferences} user={{ displayName: user.displayName, email: user.email }} />;
}
