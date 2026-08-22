import { supabase } from './supabaseClient'

// Fire-and-forget — a tracking call should never block or break the UI it's
// attached to, so failures (offline, ad blocker, etc.) are swallowed.
export function trackPageView(screen, userId) {
  supabase
    .rpc('log_page_view', { p_screen: screen, p_user_id: userId ?? null })
    .then(({ error }) => {
      if (error) console.error('Failed to log page view', error)
    })
}

export async function fetchAnalyticsSummary() {
  const { data, error } = await supabase.rpc('get_analytics_summary')
  if (error) throw error
  const row = data[0]
  return {
    totalUsers: row.total_users,
    newUsers30d: row.new_users_30d,
    totalSellers: row.total_sellers,
    activeSellers30d: row.active_sellers_30d,
    totalBuyers: row.total_buyers,
    activeBuyers30d: row.active_buyers_30d,
    repeatBuyers: row.repeat_buyers,
    totalListings: row.total_listings,
    newListings30d: row.new_listings_30d,
    totalOrders: row.total_orders,
    completedOrders: row.completed_orders,
    cancelledOrders: row.cancelled_orders,
    noShowOrders: row.no_show_orders,
    openOrders: row.open_orders,
    gmvCompleted: Number(row.gmv_completed),
    gmvLast30d: Number(row.gmv_last_30d),
    avgOrderValue: Number(row.avg_order_value),
    completionRate: row.completion_rate,
    repeatBuyerRate: row.repeat_buyer_rate,
    sellerActivationRate: row.seller_activation_rate,
    buyerActivationRate: row.buyer_activation_rate,
    totalPageViews: row.total_page_views,
    signupScreenViews: row.signup_screen_views,
    signupConversionRate: row.signup_conversion_rate,
  }
}

export async function fetchWeeklyGrowth() {
  const { data, error } = await supabase.rpc('get_weekly_growth')
  if (error) throw error
  return data.map((row) => ({
    weekStart: row.week_start,
    newUsers: row.new_users,
    newListings: row.new_listings,
    newOrders: row.new_orders,
    gmv: Number(row.gmv),
  }))
}

export async function fetchSellerWeeklyEarnings() {
  const { data, error } = await supabase.rpc('get_seller_weekly_earnings')
  if (error) throw error
  return data.map((row) => ({
    weekStart: row.week_start,
    gmv: Number(row.gmv),
    orderCount: row.order_count,
  }))
}

export async function fetchTopSellers() {
  const { data, error } = await supabase.rpc('get_top_sellers')
  if (error) throw error
  return data.map((row) => ({
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    gmv: Number(row.gmv),
    completedOrders: row.completed_orders,
  }))
}

export async function fetchTopListings() {
  const { data, error } = await supabase.rpc('get_top_listings')
  if (error) throw error
  return data.map((row) => ({
    listingId: row.listing_id,
    title: row.title,
    sellerName: row.seller_name,
    views: row.views,
  }))
}

export async function fetchTopWaitlistNeighborhoods() {
  const { data, error } = await supabase.rpc('get_top_waitlist_neighborhoods')
  if (error) throw error
  return data.map((row) => ({ neighborhood: row.neighborhood, signups: row.signups }))
}
