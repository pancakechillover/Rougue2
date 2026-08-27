# Settings Panel Refactor Plan

## 1. 目标 (Goal)
重构目前的全局设置面板 (Settings Panel)，解决随着功能增加导致的“页面过长、选项过多、难以查找”的问题。
采用 **折叠侧边栏 + 分类内容区 (Collapsible Sidebar + Tabbed Content)** 的双栏布局设计。此设计将在宽屏（PC/Tablet）下提供高效的导航，而在小屏（Mobile）端自动适配为更紧凑的顶部导航或下拉菜单，并隐藏侧边栏。

## 2. 布局架构架构 (Architecture)
整体依旧是一个覆盖全屏/弹窗的 Modal (`<div className="fixed inset-0 ...">`)。
内部主容器划分为：
- **Header**: 标题 (“SETTINGS”)，关闭按钮，以及（在 Desktop 端）用于控制侧边栏展开/收起的汉堡按钮 (Hamburger Menu / Panel Left icon)。
- **Body**: 采用 Flex/Grid 布局，包含左右两部分：
  - **Left Sidebar (Navigation)**:
    - 仅在 Desktop 尺寸下显示 (`hidden sm:flex`)。
    - 支持展开和收起状态。收起时仅显示图标，展开时显示图标+文字。
    - 包含所有大类的导航按钮。
  - **Right Content Area (Main Panel)**:
    - 占据剩余空间，独立实现垂直滚动 (`overflow-y-auto`)。
    - 移动端下（当侧边栏隐藏时），在顶部增加一个水平滚动的 Tab 栏 (Tabs) 或者 Select 下拉框，用于切换大类。
    - 根据当前选中的状态 (`activeTab`) 渲染对应的设置组件。

## 3. 模块分类 (Module Categories)

我们将现有的设置打散为以下 5 个主要模块类别：

| 模块类别 (Category) | 包含的现有设置项 (Settings) | 对应的图标 (Icon) |
| --- | --- | --- |
| **1. General & Display (常规与显示)** | 主题切换 (Themes)、音效开关 (Sound)、通知设置 (Notifications)、界面偏好 (UI Preferences)。 | `Palette` 或 `Monitor` |
| **2. Rules & Mechanics (规则与机制)** | 番茄钟时长预设 (Timer Presets)、沉浸模式 (Focus Flow)、专注力倍率、最大任务数限制。 | `Swords` 或 `Gamepad2` |
| **3. Data & Cloud (数据与云端)** | 云同步 (Cloud Sync)、本地记忆快照 (Local Snapshots)、数据导入/导出 (Import/Export)、账号找回/重置。 | `Database` 或 `Cloud` |
| **4. Advanced & Dev (高级与开发者)** | 开发者 CSS 编辑器、自定义 CSS 输入框、实验性功能 (Experimental Features)、缓存清理。 | `Terminal` 或 `Wrench` |
| **5. About & Logs (关于与更新)** | 当前版本信息、更新日志 (Release History)、制作组名单 (Credits)、相关链接。 | `Info` |

## 4. 实施步骤 (Implementation Steps)

### Step 1: 准备状态管理器与外层容器
- 在 `Settings.tsx` 中引入新状态 `activeTab`，默认值为 `'general'`。
- 引入新状态 `isSidebarOpen`，控制 PC 端侧边栏的展开与折叠，默认可基于屏幕宽度或是 `true`。
- 修改 `<div className="flex-1 overflow-y-auto ...">` 的结构，将其转变为二栏布局 (`flex`)。

### Step 2: 构建左侧边栏 (Desktop Nav)
- 使用 `framer-motion` 给予侧边栏折叠平滑的动画。
- 在侧边栏中映射 5 个模块组。
- 选中的 Tab 给予对应主题色的高亮 (如 `bg-indigo-500/20 text-indigo-400`)。

### Step 3: 构建移动端顶部导航 (Mobile Nav)
- 在右侧内容区（或整个控制面板的顶部），增加一个专门为移动端设计的水平滑动 Tab 容器 (`flex sm:hidden overflow-x-auto`)。
- 保证用户在手机上可以通过划动选择不同的设置区块。
- 选中的状态与重构的 Sidebar 同步更新。

### Step 4: 拆分与重构内容块
- 将目前在一个长列表中依次排列的 `<GeneralSettings />`, `<CloudSettingsSection />` 等子组件，根据 `activeTab` 的值进行按需渲染 ({ activeTab === 'general' && <GeneralSettings /> })。
- 提取如“版本与更新日志”为独立的组件部分，剥离出 `Settings.tsx` 中冗长的主体代码，或拆分为新的如 `<AboutSettings />`。

### Step 5: UI 微调与动画体验
- 更新新元素的样式以完美融入 Sanctum (Slate + Indigo/Emerald) 主题色彩引擎。
- 确保所有的滑动条、开关按钮在新容器内的 `padding`、`margin` 足够合理，无溢出或截断边距的情况发生。

## 5. 将来的拓展性
- 此次重构将允许以后无限扩展新的设置项，再也不必担心内容过于冗长。
- `Data & Cloud` 模块内嵌的“快照系统”获得了更多的展示高度（不会再被上面的普通设置挤到底部）。
