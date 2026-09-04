# 统一账户与双核云端架构重构计划 (Unified Account & Dual-Cloud Plan)

## 1. 现状痛点与重构目标

### 1.1 现状痛点
- **身份割裂与多套体系**：目前应用中没有真正的“账户”概念。云存档使用随机字符串 `secretCode` 作为凭证；Fellowship 公会成员则基于客户端生成的会话标识，两者互不相通。
- **换机与缓存清理体验差**：用户更换设备或清理浏览器缓存后，必须重新手动输入/寻找旧设备的 `secretCode` 才能恢复云同步；且容易导致公会中出现“同一用户双重身”或 `403 Not a member` 异常。
- **准入机制不健全**：目前的访问限制仅在前端弹窗做简单密码比对，后端无受保护的注册校验机制，无法有效限制服务器与 Redis 资源的使用。

### 1.2 重构目标
1. **未登录用户 (Guest Mode)**：无需注册或登录即可直接开始使用，全部数据保存在本地浏览器 `localStorage` 中，单机功能 100% 完整可用。
2. **账号注册与准入控制**：
   - 用户注册时必须输入**用户名 (Username)**、**密码 (Password)** 以及管理员预设的**邀请注册秘钥 (Registration Secret)**。
   - 只有秘钥校验通过才能完成注册，杜绝未授权用户占用云端配额。
3. **双核云端一体化 (Dual-Cloud by One Account)**：
   - **云存档 (Cloud Save)**：登录即自动绑定该账号的专属云端存储，自动完成拉取与增量同步，彻底告别反人类的随机密钥。
   - **公会探险 (Fellowship Guild)**：使用账户的统一持久 ID 作为公会成员的唯一凭证，彻底杜绝身份漂移、找回队长异常和权限错乱。
4. **旧数据平滑迁移 (Legacy Data Migration)**：
   - 为老用户提供“从旧 Secret Code 导入数据”通道，可一键将过往云存档绑定迁移至新注册的账号中。

---

## 2. 目标架构设计

### 2.1 状态分层模型

```
                    ┌────────────────────────────┐
                    │      未登录 (Guest)        │
                    │   所有数据保存在本地缓存   │
                    └─────────────┬──────────────┘
                                  │ (点击登录/注册)
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
       ┌────────────────────────┐   ┌─────────────────────────┐
       │      用户登录          │   │      用户注册           │
       │   - 用户名             │   │   - 用户名 + 密码       │
       │   - 密码               │   │   - 邀请注册秘钥 (必填) │
       └───────────┬────────────┘   └────────────┬────────────┘
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │       统一学者账户         │
                    │   (Unified Account Model)  │
                    └─────────────┬──────────────┘
                                  │ (颁发 JWT / Session Token)
            ┌─────────────────────┴─────────────────────┐
            ▼                                           ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│     专属云端存档 (Cloud Save) │       │   公会探险 (Fellowship Guild) │
│  - 随账号自动加载/静默同步    │       │  - 终身唯一的权威成员身份     │
│  - 支持从旧 secretCode 迁移   │       │  - 绝不再报 "Not a member"    │
└───────────────────────────────┘       └───────────────────────────────┘
```

---

## 3. 详细设计规范

### 3.1 环境变量配置 (`.env.example` & Server Config)
- `REGISTRATION_SECRET`：管理员设置的注册准入秘钥（如 `Scholar2026SecureKey`）。只有在注册时输入正确的秘钥，后端才允许创建新账号。
- `AUTH_TOKEN_SECRET`：用于签署与校验客户端 Session Token 的安全密钥。

### 3.2 数据库存储模型 (Redis Key Schemas)

| Redis Key | 数据结构 | 说明 |
| :--- | :--- | :--- |
| `scholar_user:{userId}` | Hash | 用户基础资料：`username`, `passwordHash`, `salt`, `createdAt`, `lastLoginAt`, `teamId`, `boundOldCode` 等 |
| `scholar_user_lookup:{username}` | String | 用户名到 `userId` 的全局唯一索引映射（防止重名） |
| `scholar_session:{token}` | String | 会话缓存，存储当前登录用户的 `userId` 及过期时间 (TTL) |
| `scholar_user:{userId}:save` | Hash / String | 该账号绑定的最新云存档数据与版本元数据 |
| `scholar_user:{userId}:save_history` | List | 账号的云存档历史快照列表（支持回滚与版本比对） |
| `scholar_team:{teamId}:members` | Hash | 公会成员记录，统一以 `userId` 作为 Hash 键 |

### 3.3 后端 API 接口规划 (`/api/auth.ts` 与现有接口升级)

#### 1. 新增用户认证模块 (`/api/auth.ts`)
- `POST /api/auth?action=register`
  - 请求体：`{ username, password, registrationKey }`
  - 逻辑：
    1. 校验 `registrationKey === process.env.REGISTRATION_SECRET`；
    2. 校验 `username` 是否已存在于 `scholar_user_lookup:{username}`；
    3. 使用安全哈希（如 HMAC-SHA256 / PBKDF2）加密密码；
    4. 生成 `userId`（UUID 或高可读性格式），写入 Redis；
    5. 返回登录 Session Token 与基本用户信息。
- `POST /api/auth?action=login`
  - 请求体：`{ username, password }`
  - 逻辑：比对密码哈希，通过后生成并返回 Session Token。
- `GET /api/auth?action=me`
  - 鉴权：Header `Authorization: Bearer <token>`
  - 返回当前登录用户的身份、公会归属、云存档最新同步时间戳。
- `POST /api/auth?action=logout`
  - 注销并清除当前 Session。
- `POST /api/auth?action=migrate_legacy`
  - 请求体：`{ secretCode }`
  - 将旧 `scholar_sync_{secretCode}` 下的历史存档一键复制/挂载至当前登录用户的 `scholar_user:{userId}:save` 下。

#### 2. 云存档接口升级 (`/api/sync.ts`)
- 支持携带 `Authorization: Bearer <token>` 访问；
- 优先从 Token 解析 `userId` 进行用户专属存档的读写；
- 保留向后兼容能力（如果未登录且仅传了旧 `secretCode`，仍可读取旧临时存档以便迁移）。

#### 3. Fellowship 公会接口升级 (`/api/teams.ts`)
- 移除之前临时生成的本地随机 Identity Code；
- 所有公会成员操作（加入、投票、发消息、修改目标、踢人、转让）严格从用户登录 Session 中提取唯一权威的 `userId`；
- 从根源杜绝换设备导致的 `Not a member`。

---

## 4. 前端交互与 UI 改造计划

### 4.1 全新学者通行证模态框 (`ScholarPassportModal.tsx`)
- 替代旧版分散且晦涩的“Astral Archives 密钥输入”与“解锁 Redis 提示框”；
- 采用 Sanctum 主题风格的双标签页卡片设计：
  - **Tab 1: 登录 (Sign In)**：
    - 输入：`Username`、`Password`
    - 按钮：`Sign In & Connect Cloud`
  - **Tab 2: 注册 (Create Account)**：
    - 输入：`Username`、`Password`、`Confirm Password`
    - 输入：`Registration Key`（附带提示：“Registration is restricted. Contact your guild master or administrator for an invite key.”）
    - 按钮：`Register & Activate Cloud`
- **账号管理面板 (已登录状态)**：
  - 顶部：学者昵称、等级、当前绑定的公会名称；
  - 云存档卡片：最后同步时间、同步状态（Up to Date / Pending Changes）、“立即同步”按钮；
  - 迁移工具卡片：一键输入并导入旧版 Secret Code 存档；
  - 底部：安全注销 (Sign Out) 按钮。

### 4.2 全局导航与身份状态指示器
- **Header 顶栏 / 设置入口**：
  - **未登录 (Guest)**：显示简洁的灰度 `Guest (Local)` 胶囊按钮，点击直接呼出通行证弹窗；
  - **已登录**：显示带在线绿点的用户徽章 `[Online] ScholarName`，点击可快速查看云存档状态。
- **未登录引导**：
  - 当未登录用户进入 Fellowship 公会板块或点击手动云备份时，友好提示：“Please sign in to access Guild Fellowship and Cross-Device Cloud Sync”，并提供一键登录入口。

---

## 5. 实施里程碑 (Implementation Milestones)

| 阶段 | 任务内容 | 预期交付物 |
| :--- | :--- | :--- |
| **Phase 1: 后端认证与数据模型** | 编写 `/api/auth.ts`，配置 `REGISTRATION_SECRET` 环境变量，实现注册、登录、Session 维护与老密钥迁移接口。 | 完备的认证端点与环境变量声明 |
| **Phase 2: 前端用户中心与状态对接** | 在 `AppState` 中扩展 `account` 模块，封装 `useAuth` 鉴权与 Session 自动续期 Hook。 | 前端认证状态层与本地持久化 |
| **Phase 3: 云端双核业务解耦与改造** | 改造 `/api/sync.ts` 与 `/api/teams.ts`，统一鉴权中间件，实现账户直连存档与公会。 | 消除旧 `secretCode` 强耦合与身份漂移 |
| **Phase 4: 全新 UI 与用户体验打磨** | 开发 `ScholarPassportModal` 登录/注册/管理面板，改造设置中的云端配置项，集成平滑迁移功能。 | 现代化纯英文 UI 与自适应主题 |
| **Phase 5: 全链路端到端验证与上线** | 测试未登录离线使用、注册拦截（错码/对码）、云端双向同步、公会操作连贯性。 | 编译校验通过，升级应用版本 |
