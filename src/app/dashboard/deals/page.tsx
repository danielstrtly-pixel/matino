import { createClient } from "@/lib/supabase/server";
import DealsClient from "./DealsClient";

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel fetch: chains + user's offers
  const [{ data: chainsData }, { data: userStores }] = await Promise.all([
    supabase.from("chains").select("id, name, logo, supported"),
    supabase.from("user_stores").select("store_id").eq("user_id", user?.id || ""),
  ]);

  const storeIds = userStores?.map((us: { store_id: string }) => us.store_id) || [];
  
  // Get offers for user's stores
  let offersData: any[] = [];
  if (storeIds.length > 0) {
    const { data } = await supabase
      .from("offers")
      .select(`
        id,
        name,
        brand,
        original_price,
        offer_price,
        quantity,
        quantity_price,
        unit,
        image_url,
        offer_url,
        category,
        requires_membership,
        scraped_at,
        store_id,
        chain_id,
        stores (name),
        chains (name, logo)
      `)
      .in("store_id", storeIds)
      .order("name");
    
    offersData = data || [];
  }

  // Transform to expected format
  const offers = offersData.map((o: any) => ({
    id: o.id,
    name: o.name,
    brand: o.brand,
    originalPrice: o.original_price,
    offerPrice: o.offer_price,
    quantity: o.quantity,
    quantityPrice: o.quantity_price,
    unit: o.unit,
    imageUrl: o.image_url,
    offerUrl: o.offer_url,
    category: o.category,
    requiresMembership: o.requires_membership,
    scrapedAt: o.scraped_at,
    storeId: o.store_id,
    storeName: o.stores?.name,
    chain: o.chain_id,
    chainName: o.chains?.name,
    chainLogo: o.chains?.logo,
  }));

  const chains = (chainsData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    logo: c.logo,
    supported: c.supported,
  }));

  // Find most recent scrape time
  let lastUpdated: string | null = null;
  if (offers.length > 0) {
    const newest = offers.reduce((a, b) => 
      new Date(a.scrapedAt) > new Date(b.scrapedAt) ? a : b
    );
    lastUpdated = newest.scrapedAt;
  }

  return <DealsClient offers={offers} chains={chains} lastUpdated={lastUpdated} />;
}
