import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'

// 全局注册 US 相关组件，避免组件名解析失败
import UStockCard from './components/USTockCard.vue'
import UStockDetail from './components/USTockDetail.vue'
import USAddStockModal from './components/USAddStockModal.vue'
import TagLibrary from './components/TagLibrary.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 全局组件
app.component('USTockCard', UStockCard)
app.component('USTockDetail', UStockDetail)
app.component('USAddStockModal', USAddStockModal)
app.component('TagLibrary', TagLibrary)

app.mount('#app')
