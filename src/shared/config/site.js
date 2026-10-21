export const SITE = {
  name: 'PittyBloom',
  logo: '/logo.jpeg',
  heroWord: 'PITTYBLOOM',
  heroImages: [],
  quote: ['make every memory', 'bloom into a keepsake'],
  ctaLabel: 'Explore Products',
  ctaLink: '/magazines',
  bestSellingTitle: 'Best Selling',
  moreProductsTitle: 'More Products',
  subtitle: '★ GIFTS THAT HOLD YOUR FAVOURITE MOMENTS ★',
  blurb: 'Personalised gifts made from your own photos and stories, for the people who matter most.',
  aboutTitle: 'About Us',
  about: [
    'PittyBloom is a Bangladeshi gift studio that turns your photos and stories into something you can hold.',
    'From personalised magazines and frames to polaroids and stickers, every piece is designed around you and the person you are gifting.',
    'Share your photos and your story, and we take care of the layout, printing and packaging.',
    'New ideas are always on the way, so keep an eye out for what blooms next.',
  ],
  aboutImages: [],
  magazinesTitle: 'Magazines',
  productInfo: {
    tagline: 'A magazine made from your own story.',
    included: ['Premium quality printing', 'Custom layouts designed for you', 'Your captions and messages', 'Matched to the theme you choose'],
    required: [
      'Clear, high-quality photos',
      'Tell us your preferred theme in the special instructions',
      'Need more pages? We can extend any size on request',
    ],
    perfectFor: ['Anniversaries', 'Birthdays', 'Couples', 'Friends', 'Long-distance love', 'Family keepsakes'],
    important: ['Delivery time is shared when you order', 'Fully personalised for you', 'Your photos stay private. Nothing is posted without your permission.'],
    privacy: 'Your photos and orders stay private. Nothing is shared or posted without your permission.',
    notes: ['Delivery across Bangladesh', 'Made to order, just for you'],
    buyNote: 'Wrapped with care',
  },
  whatsapp: '8801622000471',
  deliveryNote: 'Delivery charge and payment details are confirmed with you after we receive your order.',
  email: 'hello@pittybloom.com',
  instagram: '@pitty_bloom',
  instagramUrl: 'https://www.instagram.com/pitty_bloom/',
  facebookUrl: 'https://www.facebook.com/pittybloom.bd',
}

// Mobile positions come first (images sit in the narrow right column next to the text);
// the lg: values are the original desktop layout.
export const ABOUT_LAYOUT = [
  {
    alt: 'Magazine',
    className:
      'left-[2%] top-[1%] w-[56%] aspect-[3/4] lg:left-[4%] lg:top-0 lg:w-[24%] motion-safe:animate-float',
  },
  {
    alt: 'Frame',
    className:
      'left-[40%] top-[34%] w-[58%] aspect-[4/5] lg:left-[34%] lg:top-[46%] lg:w-[26%] motion-safe:animate-float-reverse',
  },
  {
    alt: 'Gift box',
    className:
      'left-[6%] top-[66%] w-[54%] aspect-square -rotate-6 lg:left-auto lg:right-0 lg:top-[6%] lg:w-[32%] motion-safe:animate-float [animation-duration:9s] [animation-delay:-3s]',
  },
]
