const placeholder = (title) => `Add your ${title} text here from the admin dashboard (Admin → Policies).`

export const policies = ['Terms & Conditions', 'Privacy Policy', 'Refund Policy', 'Shipping Policy'].map((title) => ({
  id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  title,
  content: placeholder(title),
}))
