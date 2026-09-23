// Shared free-text matching/ranking for listings -- used by both the Home
// feed's inline search box and the dedicated Search tab, so "search"
// behaves identically everywhere it appears.
export function searchFields(l) {
  return {
    title: (l.title ?? '').toLowerCase(),
    cuisine: (l.cuisine ?? '').toLowerCase(),
    seller: (l.seller ?? '').toLowerCase(),
    description: (l.description ?? '').toLowerCase(),
    diet: (l.diet ?? []).join(' ').toLowerCase(),
  }
}

export function matchesAllWords(fields, words) {
  const combined = `${fields.title} ${fields.cuisine} ${fields.seller} ${fields.description} ${fields.diet}`
  return words.every((w) => combined.includes(w))
}

export function relevanceScore(fields, words) {
  let score = 0
  for (const w of words) {
    if (fields.title.includes(w)) score += 3
    if (fields.cuisine.includes(w)) score += 2
    if (fields.seller.includes(w)) score += 1
    if (fields.description.includes(w)) score += 1
    if (fields.diet.includes(w)) score += 1
  }
  return score
}
