// Shared vocab for listing cuisine + diet tags — used by the post/edit forms,
// the browse filter pills, and (for cuisine) the "follow a cuisine" alerts feature.
export const CUISINES = [
  'Homemade',
  'Meal Prep',
  'Bakery',
  'Mexican',
  'Italian',
  'Indian',
  'Chinese',
  'Middle Eastern',
  'Caribbean',
  'Southern / Soul food',
  'Vegan',
  'Desserts',
  'Other',
]

export const DIET_TAGS = ['Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free', 'Halal', 'Kosher']

// a seller never picks these -- deterministic fallback so a listing with no
// real photo still gets a cuisine-matched icon instead of a blank/generic
// tile. Shared by the listing photo fallback (lib/listings.js) and Search's
// "Top categories" grid, so both draw from the same vocabulary.
export const CUISINE_EMOJI = {
  Homemade: '🍽️',
  'Meal Prep': '🍱',
  Bakery: '🍞',
  Mexican: '🌮',
  Italian: '🍝',
  Indian: '🍛',
  Chinese: '🥟',
  'Middle Eastern': '🧆',
  Caribbean: '🍤',
  'Southern / Soul food': '🍗',
  Desserts: '🍰',
  Vegan: '🥗',
  Other: '🍽️',
}
