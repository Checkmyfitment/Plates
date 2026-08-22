// Config-driven seasonal/holiday collections — no admin UI, no DB table,
// just a dated list matched against listing title/description/cuisine by
// keyword. Add a new season by adding an entry here.
const COLLECTIONS = [
  {
    id: 'back-to-school',
    title: '🎒 Back to school',
    startMonth: 8,
    startDay: 1,
    endMonth: 9,
    endDay: 15,
    keywords: ['school', 'lunch', 'snack', 'kid', 'granola', 'lunchbox'],
  },
  {
    id: 'fall-harvest',
    title: '🍂 Fall harvest & Thanksgiving',
    startMonth: 11,
    startDay: 1,
    endMonth: 11,
    endDay: 30,
    keywords: ['pie', 'pumpkin', 'turkey', 'stuffing', 'thanksgiving', 'cranberry', 'harvest', 'squash'],
  },
  {
    id: 'winter-holidays',
    title: '❄️ Winter holidays',
    startMonth: 12,
    startDay: 1,
    endMonth: 1,
    endDay: 5,
    keywords: ['holiday', 'christmas', 'hanukkah', 'gingerbread', 'eggnog', 'latke', 'yule'],
  },
  {
    id: 'lunar-new-year',
    title: '🧧 Lunar New Year',
    startMonth: 1,
    startDay: 15,
    endMonth: 2,
    endDay: 15,
    keywords: ['lunar', 'new year', 'dumpling', 'mooncake', 'nian gao', 'spring roll'],
  },
  {
    id: 'valentines',
    title: '💝 Valentine’s treats',
    startMonth: 2,
    startDay: 1,
    endMonth: 2,
    endDay: 14,
    keywords: ['valentine', 'chocolate', 'heart', 'romantic'],
  },
  {
    id: 'spring-brunch',
    title: '🌷 Spring & Easter brunch',
    startMonth: 3,
    startDay: 15,
    endMonth: 4,
    endDay: 15,
    keywords: ['easter', 'spring', 'brunch', 'deviled egg', 'hot cross'],
  },
  {
    id: 'summer-bbq',
    title: '☀️ Summer BBQ & picnics',
    startMonth: 6,
    startDay: 1,
    endMonth: 8,
    endDay: 15,
    keywords: ['bbq', 'barbecue', 'grill', 'summer', 'picnic', 'cookout'],
  },
]

function isDateInRange(date, startMonth, startDay, endMonth, endDay) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const value = month * 100 + day
  const start = startMonth * 100 + startDay
  const end = endMonth * 100 + endDay
  // most ranges fall within one calendar year, but winter holidays wraps
  // from December into January
  if (start <= end) return value >= start && value <= end
  return value >= start || value <= end
}

export function getActiveCollection(date = new Date()) {
  return COLLECTIONS.find((c) => isDateInRange(date, c.startMonth, c.startDay, c.endMonth, c.endDay)) ?? null
}

export function matchesCollection(listing, collection) {
  const haystack = `${listing.title} ${listing.description ?? ''} ${listing.cuisine ?? ''}`.toLowerCase()
  return collection.keywords.some((kw) => haystack.includes(kw))
}

export function getCollectionListings(listings, collection, limit = 12) {
  if (!collection) return []
  return listings.filter((l) => l.available !== false && !l.unclaimedStoreId && matchesCollection(l, collection)).slice(0, limit)
}
