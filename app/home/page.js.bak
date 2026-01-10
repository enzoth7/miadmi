import HomeClient from "./HomeClient";
import { getServerClient } from "../../lib/supabaseServer";

export default async function HomePage() {
  const supabase = await getServerClient();
  await supabase.auth.getSession();

  return <HomeClient />;
}
