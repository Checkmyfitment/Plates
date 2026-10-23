// Pure helper for apply-native-boost (kept free of Deno imports so it can be
// unit tested -- see boost.test.ts).
//
// RevenueCat's subscriber lookup lists one-time purchases under
// `non_subscriptions[productId]`, and each entry carries TWO ids: `id`
// (RevenueCat's own purchase id) and `store_transaction_id` (the App Store /
// Google Play transaction id). The app's purchase result gives us the
// STORE's id, so matching only on `id` would reject every real purchase.
export interface NonSubscriptionPurchase {
  id?: string
  store_transaction_id?: string
  store?: string
}

export function findPurchase(
  nonSubscriptions: Record<string, NonSubscriptionPurchase[]> | undefined | null,
  transactionId: string,
): NonSubscriptionPurchase | undefined {
  if (!nonSubscriptions || !transactionId) return undefined
  const all = Object.values(nonSubscriptions).flat()
  return all.find((t) => t.store_transaction_id === transactionId || t.id === transactionId)
}
