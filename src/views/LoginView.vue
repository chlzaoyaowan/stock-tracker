<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">📊</div>
      <h1>自选股笔记</h1>
      <p class="login-sub">管理你的 A 股 &amp; 美股持仓</p>

      <div class="login-form">
        <template v-if="!authStore.hasPassword()">
          <p class="setup-hint">首次使用，请设置登录密码</p>
          <input
            v-model="inputPwd"
            type="password"
            class="pwd-input"
            placeholder="设置密码"
            @keydown.enter="setupPassword"
          >
          <input
            v-model="confirmPwd"
            type="password"
            class="pwd-input"
            placeholder="确认密码"
            @keydown.enter="setupPassword"
          >
          <p v-if="error" class="error-msg">{{ error }}</p>
          <button class="btn primary" @click="setupPassword">开始使用</button>
        </template>

        <template v-else>
          <p class="login-hint">请输入密码登录</p>
          <input
            ref="pwdRef"
            v-model="inputPwd"
            type="password"
            class="pwd-input"
            placeholder="输入密码"
            @keydown.enter="doLogin"
          >
          <p v-if="error" class="error-msg">{{ error }}</p>
          <button class="btn primary" @click="doLogin">登录</button>
          <button class="btn reset-btn" @click="showReset = true">重置密码</button>
        </template>
      </div>
    </div>

    <!-- 重置密码 -->
    <div v-if="showReset" class="reset-overlay" @click.self="showReset = false">
      <div class="reset-modal">
        <h3>重置密码</h3>
        <p class="reset-warning">重置密码将清空所有本地数据（A股、美股、标签、分类）</p>
        <input v-model="resetPwd" type="password" class="pwd-input" placeholder="新密码">
        <div class="reset-actions">
          <button class="btn" @click="showReset = false">取消</button>
          <button class="btn danger" @click="doReset">确认重置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import { useStockStore } from '../stores/stockStore.js'

const router = useRouter()
const authStore = useAuthStore()
const stockStore = useStockStore()

const inputPwd = ref('')
const confirmPwd = ref('')
const error = ref('')
const showReset = ref(false)
const resetPwd = ref('')
const pwdRef = ref(null)

onMounted(async () => {
  await nextTick()
  pwdRef.value?.focus()
})

function setupPassword() {
  if (!inputPwd.value || inputPwd.value.length < 4) {
    error.value = '密码长度至少4位'
    return
  }
  if (inputPwd.value !== confirmPwd.value) {
    error.value = '两次密码不一致'
    return
  }
  authStore.setPassword(inputPwd.value)
  authStore.login(inputPwd.value)
  router.push('/')
}

function doLogin() {
  error.value = ''
  const ok = authStore.login(inputPwd.value)
  if (ok) {
    router.push('/')
  } else {
    error.value = '密码错误'
    inputPwd.value = ''
  }
}

function doReset() {
  if (!resetPwd.value || resetPwd.value.length < 4) return
  localStorage.clear()
  authStore.setPassword(resetPwd.value)
  authStore.login(resetPwd.value)
  showReset.value = false
  resetPwd.value = ''
  router.push('/')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  padding: 20px;
}

.login-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 20px;
  padding: 40px 36px;
  width: 360px;
  text-align: center;
}

.login-logo { font-size: 3rem; margin-bottom: 12px; }

.login-card h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f0883e;
  margin-bottom: 6px;
}

.login-sub {
  font-size: 0.82rem;
  color: #8b949e;
  margin-bottom: 30px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup-hint, .login-hint {
  font-size: 0.82rem;
  color: #8b949e;
  margin-bottom: 4px;
}

.pwd-input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 0.95rem;
  outline: none;
  text-align: center;
  box-sizing: border-box;
}

.pwd-input:focus { border-color: #58a6ff; }

.error-msg {
  font-size: 0.78rem;
  color: #f85149;
}

.btn {
  width: 100%;
  padding: 11px;
  border-radius: 10px;
  border: 1px solid #30363d;
  background: transparent;
  color: #e6edf3;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn.primary {
  background: #f0883e;
  border-color: #f0883e;
  color: #fff;
}

.btn.primary:hover { background: #e07a32; }

.reset-btn {
  font-size: 0.78rem;
  color: #8b949e;
  border: none;
  margin-top: -4px;
}

.reset-btn:hover { color: #e6edf3; }

.btn.danger { background: #f85149; border-color: #f85149; color: #fff; }

/* Reset modal */
.reset-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.reset-modal {
  background: #1c2128;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  width: 320px;
}

.reset-modal h3 { font-size: 1rem; margin-bottom: 8px; }

.reset-warning {
  font-size: 0.78rem;
  color: #f85149;
  margin-bottom: 14px;
}

.reset-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.reset-actions .btn { flex: 1; }
</style>
