# Finory — 借款账本

一个运行在 macOS 上的个人借款管理桌面应用，帮你清晰记录每一笔借出款项，自动计算利息，轻松追踪还款状态。

## 功能特性

Finory 围绕"借出 → 计息 → 还款"这条主线，提供以下核心能力：

**借款管理：** 记录借款人姓名、借款金额、借款日期和年利率，还款日可选填（未设置时按当天计算利息）。同一借款人可以添加多笔借款，每笔独立计息互不影响。

**利息计算：** 采用年复利公式 `利息 = 本金 × (1 + 年利率/100) ^ (天数/365) - 本金`，实时预览每笔借款到期应还总额。

**还款操作：** 支持按单笔借款还款，确认时可输入实际还款金额；也支持按借款人一键批量还款，分别填写每笔实际还款额。还款后自动记录还款日期和实际还款金额。

**状态追踪：** 三种视图快速切换——全部、待还款、已还款。顶部统计栏实时展示在借总额、应收利息和待还总计。已还款的账单同样支持编辑和删除。

**数据持久化：** 所有数据以 JSON 文件保存在系统用户数据目录下（`~/Library/Application Support/finory/`），无需额外安装数据库。

## 技术栈

- **框架：** Electron 42 + React 19 + TypeScript 6
- **构建：** Vite 8（渲染进程）+ tsc（主进程）
- **打包：** electron-builder（DMG）
- **数据存储：** 本地 JSON 文件
- **安全模型：** contextBridge + preload 隔离，渲染进程无直接 Node.js 访问权限

## 项目结构

```
Finory/
├── src/
│   ├── main/                  # Electron 主进程（后端）
│   │   ├── main.ts            # 窗口创建、IPC 处理、JSON 文件读写
│   │   └── preload.ts         # contextBridge 安全桥梁
│   └── renderer/              # React 渲染进程（前端）
│       ├── index.html         # HTML 入口
│       ├── main.tsx           # React 挂载入口
│       ├── App.tsx            # 主组件：状态管理、页面布局、弹窗控制
│       ├── types.ts           # TypeScript 类型定义
│       ├── utils.ts           # 利息计算、金额格式化等工具函数
│       ├── styles.css         # 全局样式（macOS 原生风格）
│       └── components/
│           ├── AddLoanForm.tsx    # 新增借款弹窗
│           ├── EditLoanForm.tsx   # 编辑借款弹窗
│           ├── LoanCard.tsx       # 单笔借款卡片
│           └── BorrowerGroup.tsx  # 按借款人分组展示
├── package.json
├── tsconfig.json              # 渲染进程 TS 配置
├── tsconfig.main.json         # 主进程 TS 配置
├── vite.config.ts             # Vite 构建配置
└── electron-builder.json      # DMG 打包配置
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- macOS（arm64）

### 安装依赖

```bash
npm install
```

### 开发运行

先编译代码，再启动 Electron：

```bash
npm run build && npx electron .
```

### 打包 DMG

```bash
npm run pack:dmg
```

打包产物输出到 `release/` 目录。如果 electron-builder 打包失败，脚本会自动回退使用 `hdiutil` 创建 DMG。

打包完成后，可以直接运行 `release/mac-arm64/Finory.app`，也可以双击 DMG 文件将应用拖入 Applications 文件夹安装。

> **注意：** 未经 Apple 签名的应用首次打开时，需要在"系统设置 → 隐私与安全性"中点击"仍要打开"。个人使用无需开发者账号，若需广泛分发则需要进行代码签名和公证。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | 编译主进程和渲染进程 |
| `npm run build:main` | 仅编译主进程 |
| `npm run build:renderer` | 仅编译渲染进程 |
| `npm run pack` | 编译并打包为 macOS 应用 |
| `npm run pack:dmg` | 编译并打包为 DMG（含 hdiutil 回退） |

## 许可证

ISC
