### 流程

1. Fork 本仓库，并基于 `dev` 分支创建特性分支：
   - 新功能：`feat/功能名`
   - 修复：`fix/问题描述`
   - 优化：`perf/优化点`
   - 重构：`refactor/重构点`
2. 完成开发并自测后，向 `dev` 分支发起 PR，描述改动内容与动机。
3. 等待 Review，根据反馈修改后即可合并。

### 开发环境

```bash
# 要求：Node.js >= 16，pnpm
pnpm install

# 开发模式（监听源码与样式，自动编译）
npm run dev

# 构建
npm run build
```

### 代码规范

- **提交前自检**：确保 `npx tsc --noEmit`（packages/scripts 目录下）无类型错误，代码通过 ESLint / Prettier 检查。
- **样式修改**：样式源文件为 `packages/scripts/assets/less/*.less`，修改后执行 `npm run build:style` 编译生成 `style.css`，**不要直接手改 css 产物**。
- **Commit 规范**：使用 Conventional Commits，主题单行概括，正文多行列出要点：

  ```
  feat: 各面板使用提示改为步骤条组件

  - 超星/智慧树使用提示步骤条化
  - 新增 createSteps 组件
  ```

  类型：`feat`（新功能）、`fix`（修复）、`perf`（性能优化）、`refactor`（重构）、`style`（样式/格式）、`docs`（文档）、`build`（构建）、`chore`（杂项）。

### 注意事项

- 一个 PR 只做一件事，避免混入无关改动，方便 Review。
- 不要提交 `node_modules`、构建产物（`lib/`、`dist/`）以及个人本地配置。
- 涉及题库协议、请求逻辑的改动，请在 PR 中说明测试过的平台。
- 项目计划类文档请放在 `.codebuddy/plans/`（已 gitignore，仅本地保存），不要提交到仓库。

## 行为准则

请保持友善与尊重。遇到分歧时，以让网课学习更简单为共同目标进行讨论。
