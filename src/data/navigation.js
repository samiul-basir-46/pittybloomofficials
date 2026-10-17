export const navLinks = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'faq', label: 'FAQ', to: '/faq' },
]

const placeholder = (title) => `Add your ${title} text here from the admin dashboard (Admin → Policies).`

export const policies = ['Terms & Conditions', 'Privacy Policy', 'Refund Policy', 'Shipping Policy'].map((title) => ({
  id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  title,
  content: placeholder(title),
}))

export const faqs = []