// Starting values for the magazine order flow. Everything here can be changed from Admin:
//   Admin → Order Settings   (sizes info, copies, delivery charges, rush rules, customer-facing texts)
//   Admin → Occasions        (the occasion buttons and the questions asked for each)
//   Admin → Sizes & Pricing  (A4 / A5 page counts and prices)

export const ORDER_DEFAULTS = {
  // Magazine sizes
  a4Label: 'A4 Magazine',
  a4Note: 'A4 · 21 × 29.7 cm',
  a4MaxPages: 40,
  a5Label: 'A5 Magazine',
  a5Note: 'A5 · 14.8 × 21 cm',
  a5MaxPages: 8,
  maxCopies: 10,

  // Delivery
  insideDhakaCharge: 60,
  outsideDhakaCharge: 110,
  // One rule per line: days from the order date | extra charge. Inside Dhaka only.
  rushRules: '1 | 100\n2 | 50',
  // Orders placed at or after this hour (24h clock) count from the next day.
  cutoffHour: 18,
  standardNote: 'Standard delivery is 5 days.',

  // Admin: an order is URGENT when it is needed within this many days (today counts as 0). Overdue is always urgent.
  urgentDaysInside: 2,
  urgentDaysOutside: 3,

  // Texts shown to the customer
  photosNote: 'Your selected photos are uploaded with your order and can be reviewed before you place it.',
  notesLabel: 'Cute notes and texts',
  notesHint: 'Sweet messages, quotes, inside jokes, or captions for the magazine pages',
}

// Each occasion asks its own questions. One question per line:  Label | Placeholder | required or optional | text, number or date
const occasion = (order, id, label, emoji, quick, fields) => ({
  id,
  label,
  emoji,
  quick: quick ? 'Yes' : 'No',
  status: 'Active',
  order,
  fields,
})

export const OCCASIONS = [
  occasion(
    1,
    'birthday',
    'Birthday',
    '🎂',
    true,
    [
      'Name of the birthday person | e.g. Sarah Ahmed / Tanvir | required',
      'Birthday date | e.g. 15 October 2002 | required',
      'Birthday person age | e.g. 21 or 21st Birthday | required',
    ].join('\n'),
  ),
  occasion(2, 'couple', 'Couple', '💑', true, 'Name of the couples | e.g. Fahim & Sarah | required'),
  occasion(
    3,
    'anniversary',
    'Anniversary',
    '🎉',
    true,
    [
      'Name of the couples | e.g. Fahim & Sarah | required',
      'Anniversary date | e.g. 14 February 2022 | required',
      'Anniversary year | e.g. 1st Year, 2nd Anniversary | required',
    ].join('\n'),
  ),
  // NOTE: the questions for the occasions below are simple placeholders. Edit them in Admin → Occasions.
  occasion(4, 'marriage', 'Marriage', '💍', false, 'Name of the couple | e.g. Fahim & Sarah | required'),
  occasion(5, 'personal', 'Personal', '👤', false, 'Name | e.g. Sarah Ahmed | required'),
  occasion(6, 'parents', 'Parents', '👪', false, 'Name of the parents | e.g. Mr. & Mrs. Rahman | required'),
  occasion(
    7,
    'special-day',
    'Special Day',
    '⭐',
    false,
    ['What is the special day? | e.g. Graduation, Eid, First job | required', 'Name(s) | e.g. Sarah Ahmed | required'].join('\n'),
  ),
  occasion(8, 'farewell', 'Farewell', '🎓', false, 'Name of the person | e.g. Sarah Ahmed | required'),
  occasion(9, 'best-friend', 'Best Friend', '🫂', false, 'Name(s) | e.g. Sarah & Tanvir | required'),
  occasion(
    10,
    'other',
    'Other',
    '✨',
    false,
    ['What is the occasion? | e.g. Graduation, Eid, First job | required', 'Name(s) | e.g. Sarah Ahmed | required'].join('\n'),
  ),
]

export const STEPS = [
  { id: 'magazine', label: 'Magazine' },
  { id: 'customize', label: 'Customize' },
  { id: 'photos', label: 'Photos' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'info', label: 'Your info' },
  { id: 'review', label: 'Review' },
]
