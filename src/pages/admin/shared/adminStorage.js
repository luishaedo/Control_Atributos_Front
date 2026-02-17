import { clearStoredUser, getStoredUser, setStoredUser } from '../../../utils/userStorage.js'

export function getUserFromLocalStorage() {
  return getStoredUser()
}

export function setUserInLocalStorage(user) {
  setStoredUser(user)
}

export function clearUserFromLocalStorage() {
  clearStoredUser()
}
