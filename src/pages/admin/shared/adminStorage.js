export function getUserFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem('cc_user') || 'null')
  } catch {
    return null
  }
}

export function setUserInLocalStorage(user) {
  localStorage.setItem('cc_user', JSON.stringify(user || {}))
}
