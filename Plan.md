# Workstation Presence & Target Focus Time Upgrade Plan

## 概述 (Overview)
将效率计算（Efficiency Rating）中的固定“番茄目标时长（Target Focus Time）”重构升级为**“基于实际工位在席时长（Workstation Presence Time）打卡机制”**。
通过在 Explore 页面顶部提供直观的在席打卡入口，精准记录多段在工位时间，并将当日在工位总时长作为深度专注的基准分母，计算真实的“工位专注转化率”。若当日无打卡记录，系统自动平滑回退至既有的默认目标时长。

---

## 阶段一：数据模型与底层计算函数 (Phase 1: Data Model & Foundation Logic)
- [x] **1.1 数据结构扩展 (`src/types.ts`)**
  - 定义单个工位在席打卡区间 `WorkstationInterval`:
    ```typescript
    export interface WorkstationInterval {
      id: string;
      date: string;         // 归属日期 "YYYY-MM-DD"
      startTime: string;    // ISO 8601 起始时间戳
      endTime?: string;     // ISO 8601 结束时间戳（进行中为 undefined）
      durationMinutes?: number; // 结算时长（分钟）
      location?: string;    // 选填工位/地点标签（如 "Office", "Lab", "Home Desk", "Library"）
      note?: string;        // 选填备注
    }
    ```
  - 在 `AppState` 中扩展：
    - `workstationLogs?: Record<string, WorkstationInterval[]>`：按日期归档的历史打卡记录。
    - `activeWorkstationSession?: { id: string; startTime: string; location?: string; note?: string } | null`：当前进行中的在席打卡状态。
    - `efficiencyRatingConfig?.targetTimeMode?: 'workstation' | 'daily_goal' | 'manual'`：效率基准模式配置。

- [x] **1.2 核心计算与容错工具库 (`src/lib/workstationUtils.ts`)**
  - 实现区间解析与总在席时长计算函数 `getWorkstationTotalMinutes(dateStr, state)`。
  - 实现有效基准时长获取函数 `getEffectiveTargetFocusMinutes(dateStr, state)`：
    - **优先策略**：若当日存在已结算或进行中的工位打卡记录且总时长 $>0$，以当日工位总时长作为 Target Focus Time。
    - **回退兜底策略**：若当日无任何打卡操作（总时长 $=0$），自动无缝回退至原设定目标时长（`dailyProgressGoal × pomodoroDuration`）。
    - **安全钳制策略**：若实际专注时长 $>0$ 且大于工位时长（如忘记打卡即开始专注），基准时长自动取 `Math.max(workstationMinutes, focusMinutes)`，防止转化率出现 $>100\%$ 的异常。

---

## 阶段二：Explore 页面顶部打卡与详情交互 (Phase 2: Explore Entry & Management UI)
- [x] **2.1 Explore 页面顶部右侧打卡组件 (`WorkstationHeaderControls.tsx`)**
  - 在 `ExploreView` 顶部 `PageHeader` 的 `action` 区域增加两个核心操作按钮：
    1. **快速打卡/签退按钮 (Quick Punch Button)**:
       - **离开状态 (Away)**：显示 `[ 🟢 Check In ]`，支持快速选择工位地点（如 "Office", "Lab", "Home Desk", "Library" 或自定义）并立即开启打卡。
       - **在工位中 (At Desk)**：显示呼吸发光特效与动态实时秒级计时 `[ 🟡 At Desk 02h 15m · Check Out ]`，点击立即完成本段打卡并结算时长。
    2. **打卡系统详情入口按钮 (Details / Manage Button)**:
       - 显示 `[ 📋 Workstation Log ]` 按钮，点击弹出打卡管理与时间轴详情模态框。

- [x] **2.2 工位打卡管理与补卡详情模态框 (`WorkstationModal.tsx`)**
  - 使用 `createPortal(..., document.body)` 挂载，遵循纯英文 UI 规范。
  - **当日在席概览 (Daily Overview)**：展示今日累计工位时长、有效专注时长、工位转化率进度条与区间段数。
  - **时间轴列表 (Timeline List)**：按时间顺序展示当日所有打卡段（起止时间、段时长、地点标签与备注）。
  - **手动补卡与微调 (Manual Add / Edit / Delete)**：支持添加遗漏的历史打卡区间、修改起止时间与地点、删除误操作记录。
  - **日期切换 (Date Navigation)**：支持查看与补录历史日期的工位记录。

---

## 阶段三：效率计算升级与日记/反思联动 (Phase 3: Efficiency Engine & Journal Integration)
- [x] **3.1 效率计算核心升级 (`src/components/journal/JournalView.tsx`)**
  - 在 `JournalView` 的 `selectedDayStats` 中引入工位在席基准时长：
    - 自动判断当日是否存在工位打卡；
    - 计算 `Completion Rate = Focus Hours / Target Hours`（以工位在席为分母）；
    - 结合分心扣分计算最终五星效率评分。

- [x] **3.2 效率详情弹窗联动 (`EfficiencyDetailsModal.tsx` & `DailySummaryModal.tsx`)**
  - 在 `EfficiencyDetailsModal` 中展示动态数据源标签（`Workstation Presence` 或 `Daily Goal (Fallback)`）。
  - 实时对比条直观展示工位时长与专注时长转化。
  - 在反思面板与 Expedition Vitals 中展示工位转化率信息（保持 Records 模块原有布局精炼，不增加多余图表干扰）。

---

## 阶段四：边界保护、数据同步与全流程验证 (Phase 4: Edge Case Protection, Data Sync & Validation)
- [x] **4.1 边界与异常情况处理 (Edge Case Handling)**
  - **跨日未签退与重置点保护**：跨日打卡自动依据 `timeSettings` 结算到归属日期，防止跨天计时溢出。
  - **离线与页面刷新容错**：基于绝对时间戳计算，刷新或离线不丢失打卡计时。
  - **云端同步与持久化**：打卡记录与当前进行状态即时纳入 `AppState` 云端与本地同步体系。

- [x] **4.2 编译构建与全流程验证 (Build & Verification)**
  - 运行类型检查（`lint_applet`）与完整编译（`compile_applet`），确保 0 错误通过。
