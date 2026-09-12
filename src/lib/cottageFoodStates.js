// Single source of truth for "which states have a cottage food / home
// kitchen program" -- shared by the Community Guidelines' state-law
// reference page and the compliance map shown once at signup. Deliberately
// only tracks the one binary fact that's actually stable enough to state
// here (has a program vs. doesn't) -- anything more specific (caps,
// required disclosure wording) changes too often per-state to hardcode
// safely; see LegalScreen's StateLaws() for why that's intentional.
//
// New Jersey is the one state with no cottage food program at all as of
// this writing (confirmed against the National Agricultural Law Center's
// compilation) -- kept out of STATES, listed instead in NO_PROGRAM_STATES.
export const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]

export const NO_PROGRAM_STATES = ['New Jersey']

// Two-letter postal abbreviations for the 50 states (no DC -- the map
// library this feeds doesn't have DC geometry, and DC stays covered by
// the plain-text list above regardless).
export const ABBR_BY_STATE = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
}

export const STATE_NAME_BY_ABBR = Object.fromEntries(
  Object.entries(ABBR_BY_STATE).map(([name, abbr]) => [abbr, name]),
)

export function hasCottageFoodProgram(stateName) {
  return STATES.includes(stateName)
}
