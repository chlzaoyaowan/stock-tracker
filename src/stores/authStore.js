import { defineStore } from 'pinia'
import { ref } from 'vue'

const PASSWORD_KEY = 'stock_portal_password'
const LOGIN_KEY = 'stock_portal_loggedin'

export const useAuthStore = defineStore('auth', () => {
  const password = ref(localStorage.getItem(PASSWORD_KEY) || '')
  const isLoggedIn = ref(localStorage.getItem(LOGIN_KEY) === '1')

  function setPassword(pwd) {
    password.value = pwd
    localStorage.setItem(PASSWORD_KEY, pwd)
  }

  function login(pwd) {
    if (!password.value || pwd === password.value) {
      isLoggedIn.value = true
      localStorage.setItem(LOGIN_KEY, '1')
      return true
    }
    return false
  }

  function logout() {
    isLoggedIn.value = false
    localStorage.removeItem(LOGIN_KEY)
  }

  function hasPassword() {
    return !!password.value
  }

  return { password, isLoggedIn, setPassword, login, logout, hasPassword }
})
