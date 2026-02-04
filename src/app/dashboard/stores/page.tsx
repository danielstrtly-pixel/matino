import { createClient } from "@/lib/supabase/server";
import StoresClient from "./StoresClient";

export default async function StoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: userStoresData } = await supabase
    .from("user_stores")
    .select(`
      store_id,
      stores (id, name, address, city, chain_id, external_id, profile)
    `)
    .eq("user_id", user?.id || "");

  const stores = (userStoresData || []).map((us: any) => ({
    id: us.stores?.id || us.store_id,
    name: us.stores?.name || "Unknown",
    address: us.stores?.address,
    city: us.stores?.city,
    chain: us.stores?.chain_id,
    externalId: us.stores?.external_id,
    profile: us.stores?.profile,
  }));

  return <StoresClient initialStores={stores} />;
}
