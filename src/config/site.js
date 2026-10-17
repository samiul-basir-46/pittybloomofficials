export const SITE = {
  name: 'PittyBloom',
  logo: '/logo.png',
  heroWord: 'PITTYBLOOM',
  heroImages: ['/images/hero/1.jpg', '/images/hero/2.jpg', '/images/hero/3.jpg', ''],
  quote: ['make every memory', 'bloom into a keepsake'],
  subtitle: '★ GIFTS THAT HOLD YOUR FAVOURITE MOMENTS ★',
  blurb: 'Personalised gifts made from your own photos and stories, for the people who matter most.',
  about: [
    'PittyBloom is a Bangladeshi gift studio that turns your photos and stories into something you can hold.',
    'From personalised magazines and frames to polaroids and stickers, every piece is designed around you and the person you are gifting.',
    'Share your photos and your story, and we take care of the layout, printing and packaging.',
    'New ideas are always on the way, so keep an eye out for what blooms next.',
  ],
  aboutImages: ['/images/about/1.jpg', '/images/about/2.jpg', '/images/about/3.jpg'],
  email: 'hello@pittybloom.com',
  instagram: '@pittybloomofficials',
  instagramUrl: 'https://www.instagram.com/pittybloomofficials',
}

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'FAQ', to: '/faq' },
]

export const POLICIES = ['Terms & Conditions', 'Privacy Policy', 'Refund Policy', 'Shipping Policy']

export const ABOUT_LAYOUT = [
  { alt: 'Magazine', className: 'left-[4%] top-0 w-[24%] aspect-[3/4] motion-safe:animate-float' },
  { alt: 'Frame', className: 'left-[34%] top-[46%] w-[26%] aspect-[4/5] motion-safe:animate-float-reverse' },
  {
    alt: 'Gift box',
    className:
      'right-0 top-[6%] w-[32%] aspect-square -rotate-6 motion-safe:animate-float [animation-duration:9s] [animation-delay:-3s]',
  },
]
