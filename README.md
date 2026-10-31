<div align="center">

<div style="padding:8px;border-radius:100%;background:white;width:124px;height:124px">
<img src="https://cdn.ocsjs.com/resources/img/logo.png" width=124 height=124  >
</div>

# OCS 网课助手

> OCS (Online Course Script) 网课刷课脚本，帮助大学生解决网课难题

![GitHub Repo stars](https://img.shields.io/github/stars/ocsjs/ocsjs)
![npm](https://img.shields.io/npm/v/ocsjs?color=red)
![NPM](https://img.shields.io/npm/l/ocsjs)
![今日安装](https://img.shields.io/badge/dynamic/json?color=orange&label=今日安装&query=$.data.today_install&url=https://scriptcat.org/api/v2/scripts/367)
![总共安装](https://img.shields.io/badge/dynamic/json?color=red&label=总共安装&query=$.data.total_install&url=https://scriptcat.org/api/v2/scripts/367)

</div>

<div align="center">

## 官网及教程 [https://docs.ocsjs.com](https://docs.ocsjs.com)

</div>

---

## AI 搜题

本仓库在 OCS 原有「题库配置」的基础上，接入任意 **OpenAI 兼容**的大模型接口来完成自动搜题/答题。

- 纯前端运行，**不需要自建后端服务器**：请求由油猴脚本的 `GM_xmlhttpRequest` 直接发往模型厂商，不受浏览器跨域限制。
- API Key 只保存在你本机的脚本存储中，不会上传到任何第三方服务器。
- 复用 OCS 内置的题目缓存、图片题处理和答案匹配逻辑。

> 说明：本项目仅供学习交流。自动答题可能违反课程平台的用户协议，账号风险请自行评估。

### 一、安装脚本

**方式 A：直接导入（推荐）**

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 选择任意一种方式安装脚本：
   - **一键安装**：在浏览器中打开 <https://raw.githubusercontent.com/Chika-Ire/ocsjs-1/5.0/dist/ocs.user.js>，Tampermonkey 会弹出安装页面。
   - **本地导入**：打开 Tampermonkey 管理面板 → **实用工具 → 从文件导入**，选择本仓库的 `dist/ocs.user.js`；也可以直接把文件拖进浏览器窗口。
3. 打开学习通、智慧树等课程页面，等待 OCS 悬浮窗出现。

**方式 B：自行构建**

要求 Node.js 18+ 和 pnpm：

```bash
pnpm install
# 本地构建需要的路径配置（CI 中会自动生成）
printf 'BUILD_PATH="../dist"\n' > scripts/.env
printf 'VITE_BUILD_PATH="../../dist"\n' > packages/core/.env
printf 'VITE_BUILD_PATH="../../dist"\n' > packages/scripts/.env
pnpm exec gulp -f ./scripts/tsc.js
pnpm build
```

产物为 `dist/ocs.user.js`。Windows 下如提示找不到 `vite`，需先把
`packages/core/node_modules/.bin`、`packages/scripts/node_modules/.bin` 和
`node_modules/.bin` 加入 `PATH` 再执行构建。

### 二、获取 API Key（以 DeepSeek 为例）

1. 打开 <https://platform.deepseek.com/>，注册并充值。
2. 进入 **API Keys → 创建 API Key**，复制 `sk-` 开头的字符串。
3. 记下接口地址 `https://api.deepseek.com/chat/completions` 和模型名 `deepseek-chat`。

其他厂商只要提供 OpenAI 兼容接口，同样可用（见第六节）。

### 三、导入 AI 题库配置

1. 打开课程页面，点击 OCS 悬浮窗。
2. 进入 **通用 → 全局设置 → 题库配置**，切换到 **自定义**。
3. 把下面的 JSON 完整粘贴进去，并把 `YOUR_API_KEY` 替换成你的 Key。
4. 保存并关闭设置，刷新页面。
5. 先在 **「搜索题目」** 面板手动输入一道题测试，确认能返回答案后再开启自动答题。

### 四、配置模板

```json
[
  {
    "name": "AI 搜题(DeepSeek)",
    "url": "https://api.deepseek.com/chat/completions",
    "method": "post",
    "type": "GM_xmlhttpRequest",
    "responseType": "json",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    "data": {
      "model": "deepseek-chat",
      "temperature": 0,
      "max_tokens": {
        "handler": "return (env) => env.options ? 40 : 512"
      },
      "response_format": { "type": "json_object" },
      "messages": {
        "handler": "return (env) => [{role:'system',content:'只输出JSON：{\"answer\":\"答案\"}。单选题只答选项字母；多选题字母连写（如ABC）；判断题只答“对”或“错”，禁止答字母；填空简答答答案文本。'},{role:'user',content:'题型：' + (env.type === 'judgement' ? '判断题，只答对或错，禁止答字母' : env.type) + '。题目：' + env.title + (env.options ? ' 选项：' + env.options : '')}]"
      }
    },
    "handler": "return (res) => { const s = res.choices[0].message.content.trim(); let j = null; try { j = JSON.parse(s); } catch (e) {} const a = j && j.answer ? String(j.answer) : s; return [a, a]; }"
  }
]
```

字段说明：

| 字段 | 作用 |
| --- | --- |
| `url` | 模型接口地址，OpenAI 兼容的 `/chat/completions` |
| `headers.Authorization` | `Bearer <你的 Key>` |
| `data.model` | 模型名称 |
| `data.max_tokens` | 由 handler 按题型动态设置：有选项 40，无选项 512 |
| `data.messages` | 由 handler 读取 `env.title` / `env.options` / `env.type` 拼装对话 |
| `handler` | 解析 `choices[0].message.content`，返回 `[答案, 答案]` |

`handler` 是 OCS 约定的函数源码字符串，会以你的登录身份执行。不要使用来源不明的配置。

### 五、省 token 的设计

- **只让模型输出字母**：单选回 `B`，多选回 `ABD`，判断题回 `对`/`错`，避免回显整段选项。
- **JSON 模式**：`response_format: json_object`，输出稳定为 `{"answer":"B"}`。
- **动态输出上限**：选择题 40 token，填空/简答 512 token。
- **题目缓存**：OCS 设置中的题目缓存会按题干命中，重复题不再请求模型。

实测一道选择题约消耗 110~120 个输入 token、5 个输出 token。万题量级的成本通常在几元人民币，具体以厂商计费为准。

### 六、切换模型 / 厂商

只要接口兼容 OpenAI Chat Completions，修改配置中的三处即可：

```json
"url": "https://你的接口地址/v1/chat/completions",
"headers": { "Authorization": "Bearer 你的Key" },
"data": { "model": "你的模型名" }
```

需要注意 **`@connect` 白名单**：油猴脚本只能请求脚本头部声明过的域名。本仓库已内置 `api.deepseek.com`；使用其他域名时，二选一：

1. 修改 `scripts/build-core.js` 中的 `connect` 数组，加入新域名后重新构建；
2. 或在 Tampermonkey 中编辑已安装脚本的元数据，手动添加 `// @connect 你的域名`（脚本更新后会被覆盖）。

**图片题**：DeepSeek 的 `deepseek-chat` 不支持图片输入。题目含图时需要换成多模态模型（如 Qwen-VL、GLM-4V、gpt-4o-mini 等），并修改 `data.messages` 的 handler，把 `env.images`（base64 数组）拼成 `image_url` 内容块。OCS 已自动完成图片下载与 `[图片N]` 占位符替换。

### 七、常见问题

| 现象 | 排查方向 |
| --- | --- |
| `401 Unauthorized` | Key 错误、过期或复制时带了空格 |
| `402 Insufficient Balance` | 厂商账户余额不足 |
| 请求超时 | 网络或代理问题；OCS 默认超时 60 秒 |
| 搜到答案但未选中选项 | 可在「搜索题目」面板查看模型原始返回，确认输出的是字母而不是整段解释 |
| 判断题不生效 | 确认提示词中保留了「判断题禁止答字母」，答案是「对/错」而不是 `A/B` |
| 修改配置后不生效 | 保存配置后刷新页面再试 |

### 八、开发调试

仓库自带题库管线测试，可不打开浏览器直接验证配置：

```bash
pnpm test:answerer -- --config ./answerer.config.json
```

配置文件格式见 `tests/answerer.config.schema.json`。答案匹配算法的用例测试：

```bash
pnpm test
```
