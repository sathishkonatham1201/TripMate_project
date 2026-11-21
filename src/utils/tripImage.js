export default function tripImage(destination = '') {
  const value = destination.toLowerCase()
  if (value.includes('kyoto') || value.includes('japan')) return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1500&q=85'
  if (value.includes('udaipur') || value.includes('india')) return 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1500&q=85'
  if (value.includes('goa') || value.includes('beach')) return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1500&q=85'
  return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1500&q=85'
}
