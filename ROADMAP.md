# ROADMAP

> Scholar's Dungeon 的维护路线图。按风险分级，不按心情排序。
>
> 最后盘点：2026-10-23 · 应用版本 v9.3.39 · 开发仓库 `Rougue2`（`main` 分支）
>
> **开发约定**：新功能在 `Rougue2` 开发，稳定后同步回 `ScholarDungeon`。
>
> **版本号规则**（改完代码、准备部署前必须升）
>
> 单一真源是 `src/version.ts` 的 `APP_VERSION`，`public/version.json` 由 `npm run build` 自动生成，不要手改。
>
> | 改动类型               | 升哪一位                           | 示例                |
> | ------------------ | ------------------------------ | ----------------- |
> | 修 bug、重构、样式，对外行为不变 | patch                          | v9.3.39 → v9.3.40 |
> | 新增功能               | minor，并在 `RELEASE_HISTORY` 加一条 | v9.3.40 → v9.4.0  |
> | 数据模型不兼容变更          | major                          | v9.x → v10.0.0    |
>
> `package.json` 的 `version` 已与 `APP_VERSION` 统一（9.3.40），不要让它再脱节。
>
> **不升版本号的后果不是"不规范"，而是功能失效**：`UpdateChecker` 轮询 `/version.json`，只有 `version !== APP_VERSION` 时才弹更新提示。版本号不变，PWA 用户会永远停在旧版本。

---

## 0. 这份文档怎么用

- 每一项都有 **ID**（如 `P0-1`）、**验收标准** 和 checkbox。做完一项勾一项，不要凭记忆。
- 优先级判断标准只有一条：**改晚了会损失什么**。不是"想不想做"。
- `P0` / `P1` 是护栏，`P2` 是拆房子。**护栏没建好之前不要动 P2**，否则只会把混乱换个地方藏。
- 新增想法先写进第 9 节的"待评估"，不要直接插队。

---

## 1. 当前状态快照（2026-10-23 实测）

| 指标                         | 实测值                                            | 判定   |
| -------------------------- | ---------------------------------------------- | ---- |
| `tsconfig.json` 的 `strict` | 未开启（无任何严格性开关）                                  | P1-2 |
| `any` / `as any`           | 304 处                                          | P2-5 |
| 空 `catch {}`               | 45 处                                           | P4-1 |
| `console.log`              | 29 处                                           | P4-1 |
| ESLint / Prettier          | 无                                              | P1-1 |
| CI（`.github/workflows`）    | 无                                              | P1-3 |
| 测试文件                       | 3 个（`json` / `webdavProxy` / `webdavSecurity`） | P1-5 |
| React ErrorBoundary        | 0 处                                            | P0-1 |
| 数据 schema 版本号              | 无                                              | P0-2 |
| 依赖声明一致性                    | `framer-motion` 被 import 但不在 `package.json`    | P0-3 |
| 路由                         | 0 处（无 router / hash / pushState）               | P1-4 |
| `App.tsx`                  | 2238 行                                         | P2-1 |
| `useGameState.ts`          | 2772 行                                         | P2-2 |
| 数据模型                       | 34 个（`types.ts`，554 行）                         | —    |
| 源文件                        | 138 个，孤儿组件 1 个（`modals/RewardModal.tsx`）       | P4-1 |

**与 ScholarDungeon 的已知差异**（2026-10-23 实测，不影响开发）

Rougue2 缺三项，后续顺手补齐：

- `tests/` 目录（3 个测试文件）
- `api/shared/json.ts`（`safeJsonParse`，Redis 脏数据容错）
- WebDAV 的 `resolveAndValidateHostname`（DNS 解析后二次校验，防域名指向内网）

另：`api/webdav/proxy.ts` 里内联了一份与 `api/shared/webdavSecurity.ts` 重复的校验代码，改一处漏一处，做 P0-3 时一并去重。

**结构性问题（不是死代码，是归属混乱）**

| 模块                     | 行数   | 现在挂在哪                            |
| ---------------------- | ---- | -------------------------------- |
| 公会 `TeamModule`        | 1941 | Sanctum 页面内（无独立入口）               |
| 工位打卡 `WorkstationView` | 1197 | Explore 页面内                      |
| 日志 `JournalView`       | 1146 | Record 页面内，靠 `localStorage` 布尔切换 |

目录与挂载互相矛盾：`journal/` 被 `record/` 引用，`workstation/` 被 `expedition/` 引用，`guild/` 被 `dashboard/` 引用。

---

## 1.1 需求映射：你的想法落在哪

| 你的需求                            | 编号       | 级别 | 前置依赖       | 预估    |
| ------------------------------- | -------- | -- | ---------- | ----- |
| 工位打卡按钮进 PiP + 顶栏                | **P1-6** | P1 | 无          | 1.5 天 |
| Expedition 升级 + 任务标签系统联动 Record | **P2-6** | P2 | P0-2（数据迁移） | 3–4 天 |
| 打卡 Routine 系统优化                 | **P2-7** | P2 | P0-2（数据迁移） | 5–7 天 |

**为什么打卡排 P1、另两个排 P2**

- 打卡进 PiP 看似是加按钮，实际要先收掉**三处重复的打卡逻辑**（`App.tsx:442`、`WorkstationHeaderControls.tsx:68`、`WorkstationModal.tsx:91`）。不收掉就直接加，等于制造第四份副本。所以它同时是债务清理，排 P1。
- 标签系统和 Routine 重构都要改数据结构。**没有 P0-2 的版本号和迁移入口就动模型，老用户存档会在下次更新时静默丢字段**，而且无法回滚。所以它们排在 P0-2 之后，自然落在 P2。

---

## 2. 分级标准

| 级别     | 含义            | 时间窗   |
| ------ | ------------- | ----- |
| **P0** | 会丢数据、会白屏、会泄露  | 本周    |
| **P1** | 不做的话每次改代码都在裸奔 | 两周内   |
| **P2** | 架构债，拖慢所有后续开发  | 一至两个月 |
| **P3** | 三端体验一致性       | 按需    |
| **P4** | 打磨，随时可做       | 有空    |

---

## 3. P0 · 本周必须清

### P0-1 · 加错误兜底（ErrorBoundary）

- [ ] **现状**：全项目 0 处 ErrorBoundary。任一组件抛错 → 整页白屏，用户数据还在但什么都看不到。
- [ ] **做法**：
  1. 新建 `src/components/common/ErrorBoundary.tsx`（class 组件，实现 `getDerivedStateFromError` + `componentDidCatch`）。
  2. 兜底 UI 提供三个动作：重新加载、回到 Sanctum、导出存档 JSON。
  3. 包两层：`main.tsx` 顶层一层，`App.tsx` 每个 L1 页面各一层（单页崩不拖垮全局）。
- [ ] **验收**：在某个 View 里临时 `throw new Error('test')`，页面显示兜底 UI 且能导出数据；移除后恢复正常。
- [ ] **预估**：0.5 天
- [x] **完成（2026-10-23）**
  - `main.tsx` 顶层包一层；`App.tsx` 页面区包一层（`key={activeTab}`，切页自动重置）
  - 兜底 UI：Try again / Reload the app / Export my data + 可展开 Technical details
  - 实测：注入崩溃后侧边栏与顶栏照常可用，只有页面区显示兜底；清除条件后恢复
  - ⚠️ 顺带发现项目**未安装 `@types/react`**，React 类型全是 any；已在 ErrorBoundary 里用 `declare props/setState/context/forceUpdate` 绕过，记入 P0-3

### P0-2 · 数据版本号与迁移入口

- [ ] **现状**：`AppState` 有 34 个模型、49 个 localStorage key，但**没有 schema 版本号**。只有奖励卡类型的一次性补丁（`useGameState.ts:334`）。改动字段定义，老用户数据会静默丢字段或直接崩。
- [ ] **做法**：
  1. `AppState` 增加 `schemaVersion: number`。
  2. 新建 `src/lib/migrations.ts`，导出 `migrate(raw: unknown): AppState`，内部按版本号顺序执行，每步是纯函数。
  3. 所有读存档的入口（localStorage、云同步、Google Drive 导入、WebDAV 导入）统一走 `migrate`。
  4. 迁移失败时保留原始数据到 `__backup_raw` key，不要覆盖。
- [ ] **验收**：把 `schemaVersion` 改成旧值 + 删掉一个新字段，刷新后能自动补齐且不报错；故意写入损坏 JSON，能保留备份并提示。
- [ ] **预估**：1 天
- [x] **完成（2026-10-23）**
  - `AppState.schemaVersion`（可选，缺失视为 v0）
  - 新建 `src/lib/migrations.ts`：`CURRENT_SCHEMA_VERSION = 1`、`parseSave`（永不抛错）、`getSaveVersion`、`backupBeforeMigration`、`backupRaw`、`isFutureSave`
  - `useGameState` 里 250 行内联迁移提取为 `applyLegacyMigrations(parsed, defaultState)`，加载改为 `parseSave → getSaveVersion → backupBeforeMigration → applyLegacyMigrations → 合并默认值 → 写 schemaVersion`
  - 云端恢复（`CloudSettingsSection`）与文件导入（`GeneralSettings`）在覆盖前备份当前存档，并补写 `schemaVersion`
  - 实测三种场景：正常加载写入 v1；v0 老档删字段后自动补齐 + 生成迁移前快照（快照确为旧形态）；损坏 JSON 原文留存到 `__corrupt_raw` 且页面正常
- [x] 完成

### P0-3 · 依赖声明与包管理器统一

- [ ] **现状**：`src/components/settings/CloudHistoryModal.tsx` import 了 `framer-motion`，但 `package.json` 里只有 `motion`。npm 靠提升传递依赖掩盖了问题，pnpm 严格模式直接白屏。`package-lock.json` 存在但从未与 `package.json` 对齐。
- [ ] **做法**：
  1. 统一用 `motion/react`（全项目其他 20+ 处都是），不新增依赖。
  2. 选定唯一包管理器并写进 `packageManager` 字段。当前安装实测：npm 在本机 Windows 上 14 分钟未完成，pnpm 3 分 58 秒。
  3. 删除另一个 lock 文件，避免两个来源打架。
- [ ] **验收**：删掉 `node_modules` 后全新安装 + `npm run build` 一次通过；`git grep framer-motion src/` 无结果。
- [ ] **预估**：0.5 天
- [x] 修掉 import（2026-10-23，改 `motion/react`）
- [x] **完成（2026-10-23 补充）**
  - 现状确认：`node_modules` 是 **pnpm** 装的（`.modules.yaml`），仓库却带着 **npm** 的 `package-lock.json`，两套并存
  - 统一为 pnpm：生成 `pnpm-lock.yaml`（927 包，28s），删除 `package-lock.json`
  - `package.json` 增加 `"packageManager": "pnpm@10.33.3"`
  - 补齐 `@types/react@19.3.0` + `@types/react-dom@19.3.0`（项目此前从未安装 React 类型，tsc 从未真正检查过组件）
  - 结果：`tsc --noEmit` 错误数 **19 → 0**（原 19 个错误大多是缺失类型导致的误报），ErrorBoundary 里的 declare 绕过已删除

### P0-4 · 云同步限流与口令校验

- [ ] **现状**：`api/sync.ts` 把 `secretCode` 直接拼进 Redis key（`scholar_sync_${secretCode}`）。无限流、无格式校验。口令由 `Math.random().toString(36)` 生成，约 26 位，暴力枚举不现实，但：
  - 无限流，一个客户端可以刷爆 300 人配额；
  - 未校验字符，异常输入会污染 key 空间；
  - `Math.random` 非密码学安全。
- [ ] **做法**：
  1. 服务端校验 `^[A-Za-z0-9]{16,64}$`，不合法直接 400。
  2. 基于 Redis 做 IP 维度限流（如 60 秒 20 次），超限返回 429。
  3. 前端改用 `crypto.getRandomValues` 生成口令。
  4. 配额统计改为按真实用户计数，避免同人多口令占位。
- [ ] **验收**：脚本连发 30 次请求，超过阈值后返回 429；提交含 `*`、空格的 secretCode 返回 400。
- [ ] **预估**：1 天
- [x] **完成（2026-10-23）**
  - `api/sync.ts`（Vercel）与 `server.ts`（本地）两套实现都加了：
    - 格式校验 `^[A-Za-z0-9-]{16,64}$`（兼容 26 位老 base36 与 36 位 UUID），在 Redis 连接**之前**拦截，Redis 挂了校验也生效；api/sync.ts 里为双保险，各处 handler 内仍再校验一次
    - IP 限流：60 秒 20 次，Redis `INCR` + `EXPIRE`，原子计数；计数器故障时 **fail-open**（不阻塞同步）
  - 前端 `TeamModule.tsx` 口令生成确认已用 `crypto.randomUUID()`（带 Math.random 降级），无需改动
  - 本地实测：坏口令/空格 → 400；合法老格式与 UUID → 通过校验
  - 限流 429 路径**未本地实测**（无 REDIS_URL，Redis 不连接），部署后生效

### P0-5 · 发布标记与回滚点

- [ ] **现状**：线上版本与本地提交无法对应，出问题只能靠猜。
- [ ] **做法**：每次部署前 `git tag v<version>`（版本号已在 `package.json`），推送 tag。`src/version.ts` 与 tag 保持同源。
- [ ] **验收**：`git tag` 能列出最近 5 个线上版本，任一 tag 可单独 checkout 并构建。
- [ ] **预估**：0.2 天
- [x] **完成（2026-10-23）**
  - 项目此前从未打过 tag，流程从本次建立
  - 已打 `v9.4.0`（annotated tag，附 changelog），指向 `fff2965`
  - 以后每次部署前：`git tag -a v<版本号> -F <changelog>` → `git push origin v<版本号>`
  - tag 目前只在本地，是否推送待用户决定

---

## 4. P1 · 两周内（基础设施）

### P1-1 · ESLint + Prettier

- [ ] **现状**：完全没有。45 处空 `catch {}`、29 处 `console.log` 都是无人约束的产物。
- [ ] **做法**：ESLint flat config + `@typescript-eslint` + `react-hooks` 插件；Prettier 只负责格式。先只对 `src/` 和 `api/` 开启，**规则从宽到严**，第一版只开 `no-unused-vars`、`no-empty`、`react-hooks/rules-of-hooks`。
- [ ] **验收**：`npm run lint` 可跑通；新增一条违反 `react-hooks` 的代码会被拦下。
- [ ] **预估**：0.5 天
- [x] **完成（2026-10-23）**
  - ESLint 9 flat config + typescript-eslint 8 + react-hooks 5 + Prettier
  - 第一版规则（从宽）：no-unused-vars / no-empty（允许空 catch）/ no-undef 关闭（由 TS 编译器负责）/ rules-of-hooks 为 error
  - `npm run lint` 跑通：0 errors / 1015 warnings（warnings 是 strict 阶段的待办）
  - 首次审计就抓到并修了 3 个真问题：`useInventoryItem` 回调命名撞 `use` 前缀（改名 `consumeInventoryItem`）、`RewardModalProps` 接口重复定义、`Stats.tsx` 的 `if (true)` 死代码
  - 验收探针：注入 hook-inside-condition 的文件被成功标记为 error

### P1-2 · TypeScript 严格性渐进开启

- [ ] **现状**：`tsconfig.json` 一个严格性开关都没开。
- [ ] **做法**：分三步，每步单独提交、单独跑通构建。
  1. `noUnusedLocals`、`noUnusedParameters`（先处理明显死代码）
  2. `noImplicitReturns`、`noFallthroughCasesInSwitch`
  3. `strict: true`（`noImplicitAny` 是最大头，304 处 `any` 需要逐目录清）
- [ ] **验收**：每步 `npm run typecheck` 零错误。
- [ ] **预估**：第 1-2 步各 0.5 天；第 3 步 3-5 天
- [ ] **状态：2026-10-23 评估完成，需要专项清理会话**
  - 步骤 1（noUnusedLocals/Parameters）：开启后 **736 处**（86 文件），其中大量为未使用的解构 props（App.tsx 从 useGameState 解构后未用）。codemod（eslint-plugin-unused-imports --fix + ts-morph 改名）清掉了约 600 处 import 与参数，但 ts-morph 的 rename 会误伤**同名跨文件解构属性**（useGameState 返回对象的简写属性被连带改名），引发 TS2304，已回滚
  - 步骤 2（noImplicitReturns 等）：开启后 **33 处 TS7030**（server.ts 占 11），均为真实代码卫生问题，修复需逐函数确认，约 1-1.5 小时
  - 步骤 3（strict）：304 处 any，3-5 天
  - **建议**：单独安排 1-2 个完整 session，先 git add 中间快照再跑 codemod，用 `removeWithComma` 而非文本拼接；ESLint 的 unused-imports --fix 可复用（本次已验证有效）

### P1-3 · CI：typecheck + test + build

- [ ] **现状**：没有任何自动检查。P0-3 那个白屏问题，一次构建就能拦住。
- [ ] **做法**：`.github/workflows/ci.yml`，PR 与 push 到非默认分支时触发：装依赖（pnpm，带缓存）→ `typecheck` → `test` → `build`。失败即阻断。
- [ ] **验收**：故意提交一个类型错误，PR 上 CI 变红。
- [ ] **预估**：0.5 天
- [x] **完成（2026-10-23）**
  - `.github/workflows/ci.yml`：push 到非 main 分支 + PR 触发
  - `pnpm/action-setup@v4` 从 packageManager 字段读版本，setup-node 带依赖缓存
  - 步骤：`pnpm install --frozen-lockfile` → typecheck → lint → test（占位，P1-5 补）→ build
  - 构建失败时上传 dist 产物供排查
  - 本地验证：typecheck / lint / test / build 四步全部跑通（build 产物含 PWA service worker）

### P1-4 · hash 路由 + 页面注册表

- [ ] **现状**：全项目 0 处路由。页面切换靠 `useState` 布尔与 `activeTab`，所以：
  - 刷新回到首页；
  - 移动端按返回键直接退出应用；
  - 新功能没有"位置"可放，只能再加一个开关。
- [ ] **做法**：
  1. `src/useHashRoute.ts`（约 20 行，监听 `hashchange`，不引入依赖）。
  2. `src/routes.ts` 页面注册表，每页声明 `{ level, parent, label, shell }`。
  3. 导航、面包屑、返回栈全部从注册表推导，不再手写在 `App.tsx`。
  4. URL 形如 `#/sanctum`、`#/records/journal`、`#/quests/d/<id>`。
- [ ] **验收**：任意页面刷新不丢失；手机返回键退回上一层；直接粘贴 `#/records/journal` 能打开对应页。
- [ ] **预估**：1.5 天
- [x] **核心完成（2026-10-24）**
  - 新建 `src/hooks/useHashRoute.ts`（约 45 行，零依赖）：hash 双向同步，非法 hash 回落 fallback
  - `App.tsx` 的 `activeTab` 从 `useState` 换成 `useHashRoute`，38 处引用零改动
  - URL 形如 `#/explore`、`#/stats`；首次访问自动规范化（`/` → `#/dashboard`，replaceState 不进历史）
  - CDP 实测 5 项：URL 直达 ✓ / 刷新保持 ✓ / 点击导航 hash 同步 ✓ / history.back() 回退 ✓ / 非法 hash 回落 dashboard ✓
  - **升级到 History 路由（同日追加，用户选择方案 B）**：
    - `useHashRoute.ts` → `useHistoryRoute.ts`：pathname 解析 + `pushState`/`popstate`
    - 新增 `vercel.json` rewrites（`/:path*` → `/index.html`；Vercel 文件系统优先，`/api/*` 自动豁免）
    - `server.ts` dev 模式 `appType: "spa"` 与 production `app.get('*')` 回退本就存在，未改动
    - 老书签兼容：首次加载检测 `#/tab` 并 replaceState 迁移到干净路径
    - CDP 实测 7 项：直达 / 刷新 / 导航 / back / 非法路径回落 / 老书签迁移 / API 路由不受影响（/api/stats 200）
  - **待深化**：`routes.ts` 页面注册表（面包屑、子路由如 `/quests/d/<id>`）留待后续；当前 8 个页面都是平级一级路由，暂无子路由需求


### P1-5 · 关键路径测试

- [ ] **现状**：3 个测试文件，只覆盖 JSON 解析与 WebDAV 安全。
- [ ] **做法**：补三块（用 Node 内置 `node:test`，不装框架）：
  1. 奖励结算：连续专注、倍率卡、上限截断；
  2. 云同步冲突：本地/云端时间戳与设备号的各种组合；
  3. 计时器状态机：开始/暂停/休息/循环/跨天。
- [ ] **验收**：以上三块各 ≥5 个用例，`npm test` 全绿。
- [ ] **预估**：2 天
- [ ] 完成

### P1-6 · 工位打卡统一入口（顶栏状态图标）

- [x] **第一步：收口**（2026-10-23 完成）—— 新建 `useWorkstation`，替换 4 处重复实现（HeaderControls / Modal / View / App 超时 effect）
- [x] **第二步：顶栏状态图标**（2026-10-23 完成）—— `WorkstationStatusChip.tsx`
  - 图标复用用户自己的地点图标（`resolveLocationIconOption` + `state.workstationLocationIcons`）
  - 灰色 = 未计时；彩色 = 计时中
  - 点击：未计时 → 弹出地点选择；计时中 → 直接结束打卡
  - 宽屏（`lg` 以上）在图标右侧显示**当日工位总时长**，不论是否在计时都显示
  - 位置：顶栏 XP 进度条之后、资源图标之前
- [x] **移除 Explore 顶部重复控件** —— `PageHeader` 的 action 已删除，Check In / Desk Log 不再出现在 Explore
- [ ] ~~PiP 状态条~~ **已放弃**（用户决定：PiP 保持现有简洁布局）
- [ ] **待定**：`WorkstationView`（完整工位页）和 `Desk Log` 弹窗目前**没有入口**，等待确定放置位置
  - 2026-10-23 尝试过在 Record 页 Routine Tracker 后面加一张 Workstation 卡片（`stats/StatsWorkstationSection.tsx`）
  - 两版设计均被否，**已从 Record 撤下**，`Stats.tsx` 已恢复原状
  - 组件文件保留但未挂载，作为参考实现；重新启用需在 `Stats.tsx` 里加回一行引用
- [ ] **验收**：顶栏图标灰色 → 点选地点 → 变彩色；再点 → 结束并写入 `workstationLogs`；宽屏显示当日总时长 —— 已用 CDP 实测通过
- [ ] 完成

---

## 5. P2 · 架构（护栏建好之后）

### P2-1 · 拆 `App.tsx`（2238 行）

按 L1 页面拆出容器组件；跨层数据用 context 替代 prop drilling（`ExploreView` 当前单组件接 60+ props）。

- [ ] **验收**：`App.tsx` < 400 行，无单个组件接收超过 20 个 props。
- [ ] 完成

### P2-2 · 拆 `useGameState.ts`（2772 行）

拆为 `useTimerStore` / `useRewardStore` / `useQuestStore` / `useSyncStore`，共享底层持久化。

- [ ] **验收**：单文件 < 600 行，状态改动不再互相牵连。
- [ ] 完成

### P2-3 · 目录对齐导航

`journal/` → `records/`，`workstation/` → `focus/`，`guild/` 提升为独立模块，`expedition/` 只保留真正的远征逻辑。

- [ ] **验收**：目录层级与导航层级一一对应，`grep` 不再出现跨模块反向引用。
- [ ] 完成

### P2-4 · 统一 `PageShell` / `SegmentedTabs`

替掉 `showTodayView`、`showJournalView`、`showSageConsult` 等所有布尔切换。桌面渲染 tab 行，移动渲染横滑分段控件，同一份代码。

- [ ] 完成

### P2-5 · 清理 304 处 `any`

配合 P1-2 第 3 步，按目录推进，每目录一次提交。

- [ ] 完成

### P2-6 · 任务标签系统（联动 Record + Expedition 升级）

- [ ] **现状**：`Dungeon` / `MajorDungeon` / `TodayTodo` / `StudySession` **全都没有 tags 字段**。Record 只能按时间、副本、来源统计。Expedition 是「AI 生成计划 → 落成主副本 + 子副本」（`App.tsx:1688`），产物没有任何分类信息。
- [ ] **数据模型**：
  1. `AppState` 增加 `tags: Tag[]` 注册表（`{ id, name, color, archived }`）。
  2. `Dungeon` / `MajorDungeon` / `TodayTodo` 增加 `tags?: string[]`。
  3. **`StudySession` 增加 `tags?: string[]`，在结算那一刻快照标签。** 只存 `dungeonId` 会导致改标签后历史统计全部漂移，这条不能省。
- [ ] **Record 联动**：
  1. 饼图增加「按标签」维度（复用现有 `DailyPieChart` / `WeeklyPieChart`）。
  2. 顶部筛选：时间范围 × 标签多选，两个维度正交。
  3. Journal 按标签聚合。
- [ ] **Expedition 升级**：
  1. 生成计划时把**已有标签列表**喂给 AI，要求优先复用，避免「学习 / 学习 / 自习」这种同义词分裂。
  2. 计划预览界面可编辑标签。
  3. 任务树按标签着色。
- [ ] **验收**：给两个副本打上不同标签，完成会话后在 Record 能按标签筛出各自的时长；修改副本标签后，历史统计**不变**。
- [ ] **预估**：3–4 天
- [ ] 完成

### P2-7 · Routine 系统重构

- [ ] **现状（四个具体问题）**：
  1. Routine 复用 `Dungeon` 实体（`types.ts:56-58` 的 `isRoutine` + `routineType`），一个结构两种语义。
  2. `routineType` 只有 `'daily' | 'weekly' | 'monthly'`，**不支持"每周一三五"**。
  3. 完成判定靠关联的 `StudySession` 反推，**没有独立打卡动作**——不打番茄钟就等于没做。
  4. 浏览在 Record（`Stats.tsx:1066`），编辑却要去 Dungeon 编辑，入口分裂。
- [ ] **做法**：
  1. 独立 `Routine` 实体：`{ id, title, schedule, targetMinutes?, linkedDungeonId?, tags?, archived }`。
  2. `schedule` 支持：每天 / 每周指定星期几 / 每月指定日期 / 每周 N 次。
  3. 新增 `RoutineCompletion`：`{ date, routineId, source: 'manual' | 'session' }`，两种都算完成。
  4. Sanctum 今日待办显示「今天该做的例行」，支持一键勾选。
  5. 迁移：现有 `isRoutine` 的 Dungeon 自动转成 Routine，保留 id 关联。
- [ ] **验收**：能建一个"每周一三五"的例行；不打番茄钟也能手动勾选完成；Record 里能看到连续完成天数。
- [ ] **预估**：5–7 天
- [ ] **前置**：P0-2 必须先完成
- [ ] 完成

---

## 6. P3 · 三端体验

### P3-1 · 端判断拆成两个维度

- [ ] **现状**：`App.tsx:117` 的 `isDesktop = !('ontouchstart' in window)`，触屏 Windows 笔记本被判成移动端，iPad 永远拿不到桌面布局。
- [ ] **做法**：`viewport`（compact / medium / wide，按宽度）+ `input`（touch / pointer，按 `(hover: hover)`），两者正交。删除所有 `if (isMobile)` 式的组件分支，布局差异交给 CSS 断点。
- [ ] **验收**：Chromium 触摸模拟 + iPad 尺寸下，布局符合预期且不出现双套 UI。
- [ ] 完成

### P3-2 · iOS PWA 适配

安全区、下拉回弹、安装引导、`sw.ts` 的 `skipWaiting()` 造成的资源错配（建议改为提示用户刷新）。

- [ ] 完成

### P3-3 · 移动端导航取舍

底部 5 项：Sanctum / Focus / Quests / Growth / Records。Guild 走 Sanctum 顶部未读入口，Settings 走头像菜单。桌面端 7 项全展开。

- [ ] 完成

### P3-4 · 首屏性能

路由级代码分包、长列表虚拟化、图片压缩、bundle 体积预算。

- [ ] 完成

---

## 7. P4 · 打磨

- **P4-1** 清理 45 处空 `catch {}`（至少加 `console.warn` 或上报）与 29 处 `console.log`；删除孤儿组件 `modals/RewardModal.tsx`
- **P4-2** 重写 README（技术栈写错、功能缺一半、安装步骤会把人坑死）
- **P4-3** 键盘可达性与焦点管理
- **P4-4** 错误上报（接 Sentry 或自建端点），替代现在的静默失败

---

## 8. 执行顺序（约 8 周）

| 周       | 任务                            | 产出             |
| ------- | ----------------------------- | -------------- |
| 第 1 周   | P0-1 ~ P0-5                   | 敢放心改数据结构，崩了能兜住 |
| 第 2 周   | P1-1 ~ P1-3                   | 每次提交自动被检查      |
| 第 3 周   | P1-4 + P1-5                   | "新功能放哪"有标准答案   |
| 第 4 周   | **P1-6 打卡统一入口**               | 你的第一个需求落地      |
| 第 5–6 周 | **P2-6 标签系统 + Expedition 升级** | Record 能按标签看数据 |
| 第 7–8 周 | **P2-7 Routine 重构**           | 例行任务有独立模型      |
| 之后      | P2-1 / P2-2 拆大文件、P2-3 目录对齐、P3 | —              |

**两个原则：**

1. **第 4 周之前不要碰 P2-1 / P2-2。** 护栏没建好就拆主组件，只会把混乱换个位置。
2. **功能（P2-6 / P2-7）排在拆大文件之前。** 功能有明确验收标准，拆文件没有用户可见收益。先把能用的东西做出来，再处理"代码不够漂亮"。

---

## 9. 待评估（不插队）

想法先记这里，等当前优先级清完再评估：

- （留空）

---

## 10. 变更记录

| 日期         | 变更                         |
| ---------- | -------------------------- |
| 2026-10-23 | 首次建立。基于当日代码实测数据完成 P0–P4 分级 |

---

## 附录 A · 盘点方法（可复现）

以下命令可在项目根目录重跑，用于验证快照是否过期：

```bash
# 类型严格性
grep -E '"strict"|"noImplicit|"noUnused' tsconfig*.json

# any 数量
grep -rhoE ":\s*any\b|as any" src/ api/ --include=*.ts --include=*.tsx | wc -l

# 空 catch
grep -rhoE "catch\s*(\([^)]*\))?\s*\{\s*\}" src/ --include=*.ts --include=*.tsx | wc -l

# 核心文件规模
wc -l src/App.tsx src/hooks/*.ts

# 路由使用情况（应为 0）
grep -rn "react-router\|location.hash\|pushState" src/ | wc -l
```
