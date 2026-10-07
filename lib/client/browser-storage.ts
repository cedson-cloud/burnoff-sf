import { KeyValueStorage } from './queue'

// Looked up on each call: touching localStorage can throw when site data is blocked.
export const browserStorage: KeyValueStorage = {
  getItem: k => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
}
