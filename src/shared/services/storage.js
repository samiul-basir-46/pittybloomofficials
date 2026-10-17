const PREFIX = 'pb:'

const read = (key, seed) => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : seed
  } catch {
    return seed
  }
}

export const store = {
  get: (key, seed) => Promise.resolve(read(key, seed)),
  set: (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
      return Promise.resolve(value)
    } catch (error) {
      return Promise.reject(error)
    }
  },
  clear: () =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k)),
}
