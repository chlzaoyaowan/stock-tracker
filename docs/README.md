# 自选股笔记 (Stock Portfolio Tracker)

一款本地优先的 A 股 & 美股自选股管理工具，帮助投资者记录持仓理由、追踪概念分布、定期回顾。

---

## 功能特性

### 登录系统
- 首次使用设置密码，之后每次登录需输入密码
- 密码存储在本地 localStorage
- 支持重置密码（会清空所有数据）

### 市场选择
- 登录后首页显示两个市场入口：**A 股** 和 **美股**
- 两个市场完全独立，各自有持仓、标签、分类、回顾记录

### 实时行情
| 市场 | 数据源 | 说明 |
|------|--------|------|
| A 股 | 腾讯财经 `qt.gtimg.cn` | 通过 Vite 代理避免 CORS |
| 美股 | Finnhub `finnhub.io` | 需要免费 API Key，直连无需代理 |

- A 股：自动刷新（15 秒间隔），支持上证/深证/创业板/科创板
- 美股：需配置 Finnhub 免费 API Key 后自动刷新（20 秒间隔），支持 NASDAQ/NYSE

### 持仓管理
- **A 股**：输入股票代码或名称搜索（新浪 API）→ 自动验证获取实时价格
- **美股**：输入股票代码或名称搜索（Finnhub API）→ 自动验证
- 分类、标签、买入理由（可选）、回顾记录
- 支持按分类、按标签筛选
- 支持设置买入价、目标价、止损价

### 分类 & 标签
- **分类**：按板块分组，支持增删分类
- **标签**：从预设标签库点选（两个市场共用同一标签库），最多显示 10 个
- 支持增删标签

### 回顾提醒
- 持仓 7 天未回顾 → 黄色"待回顾"标记
- 持仓 30 天未回顾 → 红色"需关注"标记
- 标记已回顾，记录回顾时间

### 分页显示
- A 股 / 美股列表均支持分页，每页 8 只股票
- 支持页码导航，自动过滤后回到第 1 页

### 数据导入
- 支持 Excel (.xlsx, .xls) 和 JSON 格式批量导入
- 自动检测重复股票，预览确认后导入
- 导入时可选分类

### 数据存储
- 全部数据存储在浏览器 `localStorage`，本地优先
- 两个市场的持仓分开存储，互不影响

---

## 项目结构

```
stock-tracker/
├── src/
│   ├── services/
│   │   ├── stockApi.js       # A股：腾讯行情 + 新浪搜索 + 新浪分时
│   │   └── usStockApi.js     # 美股：Finnhub 行情
│   ├── stores/
│   │   ├── authStore.js      # 登录状态
│   │   ├── stockStore.js     # A股持仓数据
│   │   ├── usStockStore.js   # 美股持仓数据
│   │   ├── tagStore.js       # 标签库（两市场共用）
│   │   └── categoryStore.js  # 分类管理
│   ├── views/
│   │   ├── LoginView.vue     # 登录页
│   │   ├── HomeView.vue      # 首页（市场选择）
│   │   ├── AStockView.vue    # A股模块
│   │   └── USTockView.vue    # 美股模块
│   ├── components/
│   │   ├── StockCard.vue      # A股持仓卡片（含分时图）
│   │   ├── StockDetail.vue    # A股详情面板
│   │   ├── AddStockModal.vue  # A股添加弹窗
│   │   ├── ImportModal.vue    # A股数据导入弹窗
│   │   ├── USTockCard.vue     # 美股持仓卡片
│   │   ├── USTockDetail.vue   # 美股详情面板
│   │   ├── USAddStockModal.vue # 美股添加弹窗
│   │   ├── TagLibrary.vue     # 标签库管理弹窗
│   │   ├── CategoryBar.vue    # 分类标签栏
│   │   └── IndexOverview.vue  # 大盘指数展示
│   ├── router/
│   │   └── index.js          # Vue Router 配置
│   ├── App.vue               # 根组件（路由出口）
│   └── main.js               # 入口
├── vite.config.js             # Vite 配置（含 API 代理）
├── Dockerfile                 # Docker 镜像构建文件
├── package.json
└── dist/                      # 生产构建产物
```

---

## 快速开始

### 开发模式

```bash
cd stock-tracker
npm install
npm run dev
```

访问 http://localhost:5173

### 生产构建

```bash
npm run build
```

产物输出到 `dist/`，可部署到任意静态服务器。

### Docker 部署

```bash
# 构建镜像
docker build -t stock-tracker .

# 运行容器（映射到 8080 端口）
docker run -d -p 8080:80 stock-tracker
```

访问 http://localhost:8080

### 配置美股 API Key

1. 访问 [finnhub.io/register](https://finnhub.io/register) 注册（免费）
2. 复制你的 API Key
3. 进入美股页面后，点击顶部"⚠ 配置API Key"按钮粘贴 Key
4. Key 存储在本地，只配置一次即可

---

## 生产部署说明

> **重要**：A 股腾讯行情、新浪搜索通过 Vite 开发服务器代理解决 CORS 问题。
>
> - `npm run dev`（开发模式）→ 代理正常工作 ✅
> - 直接打开 `dist/index.html`（生产模式）→ 代理不生效，CORS 被浏览器拦截 ❌
>
> **Docker 部署**（推荐）：使用 Dockerfile 构建的镜像，Nginx 已配置好生产环境代理规则。
>
> **手动部署**：在服务器上配置反向代理：
> ```nginx
> # A股腾讯行情
> location /api/tencent {
>     proxy_pass https://qt.gtimg.cn;
> }
> # A股新浪分时图
> location /api/sina/quotes {
>     proxy_pass https://hq.sinajs.cn;
> }
> # A股新浪搜索
> location /api/sina/search {
>     proxy_pass https://suggest3.sinajs.cn;
> }
> ```
>
> 美股 Finnhub 为直连，不需要代理（浏览器可直接访问 finnhub.io）。

---

## 技术栈

- **框架**：Vue 3 (Composition API)
- **路由**：Vue Router 4
- **状态管理**：Pinia
- **构建工具**：Vite
- **样式**：原生 CSS（无框架）
- **图表**：轻量 SVG 分时图（无外部图表库）

---

## License

MIT