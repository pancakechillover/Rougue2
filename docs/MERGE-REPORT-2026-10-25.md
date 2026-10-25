# 合并报告：Rougue2 main（安宁账号系统） × feat-workstation-checkin（PiP 工位栏）

**日期**：2026-10-25
**执行**：小迪（CodeBuddy）
**结果**：✅ 合并完成并推送，远端 `feat-workstation-checkin` = `5d0f1f6`，GitHub CI 全绿

---

## 一、一句话结论

安宁的账号系统代码质量不错，但**提交时漏了三件事**（一个 TypeScript 报错、锁文件删错、Redis 地址泄露到公网）。我合并后逐一修好，现在 CI 是绿的，可以进 Vercel 预览。

---

## 二、合并前两边状态

| 分支 | 提交 | 内容 |
|---|---|---|
| `origin/main` | `e985413` | 安宁的统一账号系统（Scholar Passport），53 个文件 +21072/-11792 |
| `feat-workstation-checkin` | `925304e` | 我的 PiP 极简左栏工位打卡（22 个提交） |
| 共同祖先 | `d824847` | — |

两边各有对方没有的提交，`ci.yml` / `AGENTS.md` / `docs/archive/*` 内容完全一致（自动合掉），**唯一真实冲突是 `public/version.json` 的时间戳**（取较新值 `1792911921279`）。

`src/App.tsx` 双方都改（+88/-23 vs +10/-2），**git 自动合并成功** —— PiP portal（`PipDutyRail`）与 auth 会话逻辑并存，账号状态与旧 `secretCode` 完整降级共存。

---

## 三、安宁提交里的 4 个问题

### 1. 🔴 TypeScript 编译错误（**main 上 CI 本来就是红的**）

```ts
// src/hooks/useAuth.ts:91  声明
export function useAuth(options: UseAuthOptions = {}) { ... }

// src/App.tsx:365  调用（传了两个位置参数）
} = useAuth(state, setState);
```

→ `TS2554: Expected 0-1 arguments, but got 2`

**修复**：`useAuth({ state, onUpdateState: setState })`

**GitHub Actions 实证**：

| 提交 | 分支 | CI 结论 |
|---|---|---|
| `e985413` | main | ❌ **failure** |
| `5d0f1f6` | feat-workstation-checkin | ✅ **success** |

### 2. 🔴 锁文件删错 → CI 必红

安宁删了 `pnpm-lock.yaml`，换成 `bun.lock` + `package-lock.json`。但：
- `package.json` 钉死 `"packageManager": "pnpm@10.33.3"`
- CI 跑 `pnpm install --frozen-lockfile` → 找不到锁文件直接失败

**修复**：用 pnpm 重新生成 `pnpm-lock.yaml`（含新依赖 `svg-captcha@1.4.0`），删掉另外两份。

> **锁文件是什么？** 就像超市购物清单——记录装了哪些依赖、什么版本。同一份项目只能有一份清单，否则两个 AI 装出来的版本不一样，代码就跑不起来。

### 3. 🔴 安全：生产 Redis 地址泄露到公网

`public/assets/aistudio/RedisInsight_connections_*.json` 内容：

```json
{ "host": "redis-13678.c1.ap-southeast-1-1.ec2.cloud.redislabs.com",
  "port": 13678, "username": "default", "name": "Scholars-Dungeon-DB" }
```

它在 `public/` 目录下 → 会被 Vite 打进 `dist` → 部署到 Vercel 后**任何人访问网址就能直接下载到你的数据库地址**。

**修复**：删除文件 + `.gitignore` 加规则 + **复检 `dist/` 已无残留**（已验证）。

> ⚠️ **Git 历史里仍可查到**。按你的选择没有重写历史。若日后想彻底抹除，需要重写所有 commit SHA，会影响两个仓库的同步。

### 4. 🟡 AI 工具垃圾文件（1.3MB）

- `.aistudio/` —— Google AI Studio 的临时媒体存储（8 张 PNG + 设计文档）
- `public/assets/aistudio/` —— 9 张界面设计稿截图 + 上述 Redis JSON

源码对 `public/assets/aistudio/` **零引用**。按你的选择全部删除不留档，路径已加进 `.gitignore`。

> 其中有一张是 Scholar Passport 的界面设计稿（"NO CLOUD ARCHIVE FOUND" 弹窗），源码没用到，但以后想改这个界面时可以作参考。

---

## 四、安宁代码的正面评价

审计后没有发现安全问题：

| 检查项 | 结果 |
|---|---|
| 硬编码密钥 | ✅ 无。全部走 `process.env`，`AUTH_TOKEN_SECRET` < 16 字符直接 fail-closed 返回 503 |
| 密码存储 | ✅ `crypto.scrypt` + 随机 salt，不存明文 |
| 会话令牌 | ✅ HMAC-SHA256 签名 |
| 外部网络请求 | ✅ 无。验证码是本地 SVG 生成 |
| Redis 扫描 | ✅ 用 `LSET` 原地改写，不使用 `KEYS` |
| 旧数据迁移 | ✅ 4 个 Redis 域（云存档 / 公会 / 推送 / 配额）全覆盖，含去重与 cron 竞态保护 |

`api/sync.ts` 的口令格式放宽修复保留完好；`api/push.ts` 还顺手修了重复推送任务残留的 bug。

---

## 五、本次提交清单

```
5d0f1f6  chore(repo): restore pnpm lockfile and drop AI scratch files
ce7184a  fix(auth): call useAuth with the options object it expects
2789fd9  Merge origin/main (unified account system) into feat-workstation-checkin
```

分支名 `merge/main-and-workstation` 用完已删，工作区干净。

---

## 六、验证记录

| 检查 | 命令 | 结果 |
|---|---|---|
| 依赖一致性 | `pnpm install --frozen-lockfile` | ✅ Lockfile is up to date |
| 类型检查 | `pnpm run typecheck` | ✅ 0 错误 |
| 代码规范 | `pnpm run lint` | ✅ 0 错误（299 warnings 是全项目历史遗留，不阻塞 CI） |
| 测试 | `pnpm test` | ✅ 通过（暂无测试用例，P1-5 待补） |
| 构建 | `pnpm run build` | ✅ 成功 |
| 产物安全 | `grep -rl "redis-13678" dist/` | ✅ 无残留 |
| 远端同步 | `git ls-remote` | ✅ 远端 = 本地 = `5d0f1f6` |

---

## 七、下一步（等你操作）

1. **你去 Rougue2 的 Vercel Preview 试用** —— 重点看两块：
   - 新账号系统：注册 / 登录 / Scholar Passport 弹窗 / 旧 secretCode 是否仍能同步
   - PiP 工位栏：拉出小窗、拖宽到 340px 以上看左侧打卡栏、数字与顶栏是否一致
2. **试用满意后**告诉我，我把 `Rougue2 main` 同步到 `ScholarDungeon main`（正主上线）
3. ⚠️ **部署前记得在 Vercel 配好环境变量**，否则新账号系统会 fail-closed：
   - `AUTH_TOKEN_SECRET`（≥16 字符）
   - `REGISTRATION_SECRET`
   - （已有）`REDIS_URL`、`VAPID_*`

---

## 附：本次踩坑记录

- **环境变量里的 `http_proxy=127.0.0.1:51918` 是 WorkBuddy 自己的通道**，npm/pnpm 用不了。Clash 真代理在 **7897**。
- `registry.npmjs.org` 和 `registry.npmmirror.com` 都超时，**`mirrors.cloud.tencent.com/npm/` 可用**（需直连，走代理反而失败）：
  ```bash
  env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
    pnpm install --lockfile-only --registry=https://mirrors.cloud.tencent.com/npm/
  ```
- `git push -c http.proxy=...` 会报 unknown switch —— `-c` 必须放在子命令**之前**：`git -c http.proxy=... push`
- stash pop 遇冲突时别硬解：`git reset --hard HEAD` 回退，再用 `git checkout stash@{0} -- <file>` 单独取回需要的文件。
