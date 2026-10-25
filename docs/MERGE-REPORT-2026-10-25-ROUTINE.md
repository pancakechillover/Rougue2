# 合并报告：安宁的 zip 导出包 × Rougue2 工作分支

**日期**：2026-10-25
**输入**：`scholar's-dungeon.zip`（Google AI Studio 下载包，5.42 MB / 259 条目）
**结果**：✅ 逐文件择优合并完成，CI success
**分支**：`feature-ws-routine-v2` @ `8c9aed2`

---

## 一、一句话结论

安宁的 zip **是从我合并账号系统之前的 main 导出的**——所以整包覆盖会把我的 PiP 工位栏和已修的 TS 错误一起打回去。我改成逐文件择优：她的新功能全收，我的两处修复保住，顺手还修掉了她自己代码里的一个编译错误。

---

## 二、为什么要逐文件择优

先看一个容易误判的信号：初次 diff 显示 **184 个文件"内容不同"**。但拆开看，全是 **CRLF vs LF 换行符差异**——zip 导出是 LF，Windows 仓库是 CRLF。

归一化行尾 + 去 BOM 后，**只剩 20 个文件是真改动**。

| 对比方式 | 结果 |
|---|---|
| 直接字节比对 | 184 个"不同"（噪声） |
| 归一化行尾后比对 | **20 个真实改动** |

更关键的是基线：安宁的包里**没有 `PipDutyRail.tsx`、没有 `timerStore.ts`**——她导出时还没合并我的 PiP 工作。所以整包覆盖 = 我的功能被回退。

---

## 三、20 个真实改动的分类处置

### A. 全盘接收她的新功能（14 个文件）

| 文件 | 改动 |
|---|---|
| `src/lib/workstationUtils.ts` | 新增 `getMaxWorkstationSessionMinutes(state)`，单次会话上限 **30~1440 分钟可配置**（原为写死 240） |
| `src/hooks/useWorkstation.ts` | 新增 `switchLocation`（切地点自动结算旧段+续开新段）、`saveInterval`、`deleteInterval`、`updateIntervalEndTime` |
| `src/components/workstation/WorkstationStatusChip.tsx` | 顶栏打卡钮改为**快捷菜单**：签退 / 切地点 / 工位日志 / 管理地点 |
| `src/components/modals/WorkstationTimeoutModal.tsx` | 超时弹窗可**手动改结束时间**、可**跳转设置页** |
| `src/components/record/stats/StatsWorkstationSection.tsx` | **1158 行全新模块**：24 小时双环时钟（工位在场环 + 专注环）、地点分布、可编辑区间 |
| `src/components/record/Stats.tsx` / `StatsView.tsx` | 接入新统计模块，透传 `setState` + `syncToCloud` |
| `src/components/settings/GeneralSettings.tsx` | 新增 **Workstation Check-in** 设置区：2/4/6/8/12h 预设 + Custom Hours 滚轮 + Manage Locations & Icons |
| `src/components/settings/SettingsSearchIndex.ts` | 新增设置项搜索条目 |
| `src/components/settings/ViewSettingsModal.tsx` | 新增 Workstation Tracker 开关 |
| `src/components/journal/RoutineTracker.tsx` | 响应式 padding + 图标颜色微调 |
| `src/types.ts` | 新增 `workstationMaxSessionMinutes`、`showWorkstationTracker` |

### B. 接收但需修复（2 个文件）

**`src/App.tsx`** — 她的版本有两处倒退：

```diff
- <PipDutyRail ...>          ← 她删了，PiP 窗口的工位栏会消失
- <CompactTimer ... />
+ <CompactTimer ... />

- } = useAuth(state, setState);          ← 改回错误写法，TS2554
+ } = useAuth({ state, onUpdateState: setState });
```

**`src/components/expedition/ExploreView.tsx`** — 她自己的 bug：删了 import 却仍在渲染。

```diff
- import { WorkstationView } from '../workstation/WorkstationView';   ← 被删
  ...
  <WorkstationView state={state} ... />   ← 第 553 行仍在用
```

→ 会报 `TS2304: Cannot find name 'WorkstationView'`。已补回 import。

### C. 完全不要

| 项目 | 原因 |
|---|---|
| `.aistudio/` + `public/assets/aistudio/` | 1.3 MB AI 垃圾，含生产 Redis 地址泄露（上一轮已处理） |
| `bun.lock` + `package-lock.json` | 项目 `packageManager` 钉死 pnpm，CI 跑 `pnpm install --frozen-lockfile` |
| `.gitignore` | 她的是旧版（73 字节），缺安全规则和 `_原始版备份/` |

---

## 四、运行时实测（无头 Chrome + CDP）

编译通过 ≠ 运行正常，所以我用 Chrome DevTools Protocol 真跑了一遍：

| 检查项 | 结果 |
|---|---|
| 首页渲染 | ✅ React 挂载正常，控制台**零应用异常** |
| 设置页工位区 | ✅ `WORKSTATION CHECK-IN` / AUTO-CUTOFF 4h (240m) / 2h·4h·6h·8h·12h 按钮 / Custom Hours / 3 个地点 / Manage Locations & Icons |
| Record 页 24h 环形时钟 | ✅ 双环渲染正常（0%、0h 00m、00/04/08/12/16/20 刻度、空状态提示、双色图例） |
| 顶栏打卡菜单 | ✅ 弹出 Desk Log / Manage Locations / 地点列表 |
| 打卡流程 | ✅ 选 Home 后标题变为 "At Home — click to open workstation menu"，顶栏显示金色 Home 图标 + 时长 |
| PiP 工位栏 | ✅ 产物含 `pip-container`（5 处），包裹结构完整 |
| 数据源一致性 | ✅ PiP 与顶栏共用 `useWorkstation` + `getWorkstationTotalMinutes` + `DurationText`，天然同步 |

控制台仅 2 条无害输出：ServiceWorker 注册失败（预览服务器无 sw.js MIME 配置）+ Vercel Analytics（本地未部署）。

### 两个测试限制（不是 bug）

- **PiP 无法自动化**：headless Chrome 不支持 `documentPictureInPicture`，只能验证代码路径与产物打包。
- **`vite preview` 无 SPA fallback**：直接访问 `/record` 会拿到首页，必须先开首页再客户端导航。线上 Vercel 有 `vercel.json` rewrites，不受影响。

---

## 五、最终验证

| 检查 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ Lockfile is up to date |
| `pnpm run typecheck` | ✅ 0 错误 |
| `pnpm run lint` | ✅ 0 错误（301 warnings 为全项目历史遗留） |
| `pnpm test` | ✅ 通过 |
| `pnpm run build` | ✅ 成功 |
| dist 安全复检 | ✅ 无 Redis 泄露、无 aistudio 残留 |
| 远端 SHA 核对 | ✅ 远端 = 本地 = `8c9aed2` |
| GitHub Actions | ✅ **success** |

---

## 六、提交清单

```
8c9aed2  fix(app): keep the PiP duty rail and the corrected useAuth call
fbd0b1f  feat(workstation): configurable session limit, location switching, 24h presence stats
b1c2c3b  (previous) docs: add merge report for the account-system + PiP duty rail merge
```

---

## 七、需要你留意的行为变化

**顶栏打卡钮的交互变了**：

| | 之前 | 现在 |
|---|---|---|
| 未在岗时点击 | 选地点 | 选地点（不变） |
| 在岗时点击 | **直接签退** | **弹出菜单**（签退 / 切换地点 / 工位日志 / 管理） |

切换地点会自动结算当前段并在新地点续开，时间轴不断档。

**新增可配置项**：单次会话自动签退上限（默认 4h），在 设置 → General Settings → Workstation Check-in。

**统计页新增模块**：24 小时双环时钟，默认开启，可在 设置 → View Settings 里关。

---

## 八、下一步

1. **去 Rougue2 Preview 试用**（Vercel 会自动为 `feature-ws-routine-v2` 建 Preview 部署）
2. 重点试：**顶栏打卡菜单**（签退/切地点/工位日志）、**设置里的时长上限**（改一个值看是否立即生效）、**统计页环形时钟**（有工位数据后才有内容）
3. 满意后告诉我，我把它合进 `main` → 再同步到 ScholarDungeon 正主
4. ⚠️ 部署前记得在 Vercel 配好 `AUTH_TOKEN_SECRET`（≥16 字符）和 `REGISTRATION_SECRET`
