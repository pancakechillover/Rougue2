# 🚀 GitHub Pages 部署指南 (学海秘境)

由于本项目是一个纯前端项目（基于 Vite + React + TypeScript），你可以非常方便地将其免费部署在 **GitHub Pages** 上。

---

## 1. 准备工作

在开始之前，请确保你的电脑上已安装以下工具：
*   **Node.js** (建议版本 18.0 或更高)
*   **Git**
*   **GitHub 账号**

---

## 2. 第一步：创建 GitHub 仓库

1.  登录你的 GitHub。
2.  点击右上角的 `+` -> `New repository`。
3.  给仓库起个名字（例如：`scholars-dungeon`）。
4.  设为 `Public`（公开），然后点击 `Create repository`。

---

## 3. 第二步：本地代码配置

在你的项目根目录下，你需要进行一些简单的配置：

### 1. 安装部署工具
打开终端（Terminal），运行以下命令：
```bash
npm install gh-pages --save-dev
```

### 2. 修改 `package.json`
在 `package.json` 中添加以下内容：
*   **homepage**: 设置为 `https://<你的用户名>.github.io/<仓库名>/`
*   **scripts**: 添加 `predeploy` 和 `deploy` 脚本。

示例：
```json
{
  "name": "scholars-dungeon",
  "homepage": "https://yourusername.github.io/scholars-dungeon/",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  ...
}
```

### 3. 修改 `vite.config.ts`
为了确保静态资源（图片、JS、CSS）能正确加载，你需要设置 `base` 路径。
打开 `vite.config.ts`，修改如下：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/scholars-dungeon/', // 这里必须和你的仓库名一致
})
```

---

## 4. 第三步：上传代码并部署

在终端依次运行以下命令：

1.  **初始化 Git**:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

2.  **关联远程仓库**:
    ```bash
    git remote add origin https://github.com/你的用户名/scholars-dungeon.git
    git branch -M main
    git push -u origin main
    ```

3.  **执行部署**:
    ```bash
    npm run deploy
    ```
    *这个命令会自动打包项目并上传到仓库的 `gh-pages` 分支。*

---

## 5. 第四步：在 GitHub 上开启页面

1.  进入你的 GitHub 仓库页面。
2.  点击 `Settings` -> `Pages`。
3.  在 `Build and deployment` 下的 `Branch` 部分，确保选择了 `gh-pages` 分支和 `/ (root)` 文件夹。
4.  点击保存。稍等几分钟，你就可以通过 `homepage` 里的链接访问你的网页了！

---

## 🔑 关于 API 调用 (如 Gemini API)

本项目是一个全栈应用，使用了自己的 Node.js / Express 后端服务提供部分核心功能保护。

### 1. 站点服务端的 Gemini API Key
为了保证安全，我们的应用通过后端代理接口 `/api/sage` 来调用站点配置的默认 Gemini 模型。
请在服务端的环境变量中配置您的服务端密钥：
```env
GEMINI_API_KEY=你的真实服务端API密钥
```
**绝对不要**使用 `VITE_GEMINI_API_KEY`！任何以 `VITE_` 开头的前缀都会被构建工具无条件地打包进前端公开的 JavaScript 发行代码中，造成您的主 Key 泄露。

### 2. 用户自填的 AI API Key
用户可以在应用的“设置 - 外部系统集成”页面自由填写他们自己的个人 API Key。这部分 Key 是**用户个人的配置**，并且仅保留在用户前端的本地域（`localStorage`）中，在使用时直接从用户的浏览器本地发起请求，跟上面的系统级 `GEMINI_API_KEY` 是完全独立互不影响的两套系统。

### 3. 部署环境要求
由于本项目包含了不可或缺的 Node.js 后端接口（如 `server.ts` 和 `/api/*`），如果你需要完整的 AI 支持、云端存档数据同步功能以及推送提醒，推荐使用支持全栈环境的云原生托管平台（如 Google Cloud Run, Vercel, Railway 等），纯静态网页托管方案（如原生的 GitHub Pages）将无法运转这些后端安全校验接口和定时后台任务。


---

## 🛠 常见问题排查
*   **白屏**：通常是 `vite.config.ts` 里的 `base` 路径没设对。
*   **404**：GitHub Pages 刷新页面可能会报 404（因为是单页应用 SPA）。解决方法是在 `public` 文件夹下添加一个 `404.html` 并重定向到 `index.html`。

---

**祝你的“学海秘境”顺利上线！🚀**
