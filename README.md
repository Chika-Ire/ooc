<div align="center">

<div style="padding:8px;border-radius:100%;background:white;width:124px;height:124px">
<img src="https://cdn.ocsjs.com/resources/img/logo.png" width=124 height=124  >
</div>

# OOC 网课助手

> OOC (Open Online Course) 网课助手，基于 OCS 二次开发，帮助大学生解决网课难题


</div>

<div align="center">

## 项目仓库 [https://github.com/Chika-Ire/ooc](https://github.com/Chika-Ire/ooc)

当前版本：**0.2.0**　｜　基于 [OCS](https://github.com/ocsjs/ocsjs) 二次开发，遵循 MIT 协议

</div>

---

## AI 搜题

本项目基于 OCS 的「题库配置」机制，接入任意 **OpenAI 兼容**的大模型接口来完成自动搜题/答题。

- 纯前端运行，**不需要自建后端服务器**：请求由油猴脚本的 `GM_xmlhttpRequest` 直接发往模型厂商，不受浏览器跨域限制。
- API Key 只保存在你本机的脚本存储中，不会上传到任何第三方服务器。
- 复用 OCS 内置的题目缓存、图片题处理和答案匹配逻辑。

> 说明：本项目仅供学习交流。自动答题可能违反课程平台的用户协议，账号风险请自行评估。

### 一、安装脚本

**方式 A：直接导入（推荐）**

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 选择任意一种方式安装脚本：
   - **一键安装**：在浏览器中打开 <https://raw.githubusercontent.com/Chika-Ire/ocsjs-1/5.0/dist/ooc.user.js>，Tampermonkey 会弹出安装页面。
   - **本地导入**：打开 Tampermonkey 管理面板 → **实用工具 → 从文件导入**，选择本仓库的 `dist/ooc.user.js`；也可以直接把文件拖进浏览器窗口。
3. 打开学习通、智慧树等课程页面，等待 OOC 悬浮窗出现。

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

产物为 `dist/ooc.user.js`。Windows 下如提示找不到 `vite`，需先把
`packages/core/node_modules/.bin`、`packages/scripts/node_modules/.bin` 和
`node_modules/.bin` 加入 `PATH` 再执行构建。

### 二、获取 API Key（以 DeepSeek 为例）

1. 打开 <https://platform.deepseek.com/>，注册并充值。
2. 进入 **API Keys → 创建 API Key**，复制 `sk-` 开头的字符串。
3. 记下接口地址 `https://api.deepseek.com/chat/completions` 和模型名 `deepseek-chat`。

其他厂商只要提供 OpenAI 兼容接口，同样可用（见第六节）。

### 三、导入 AI 题库配置（图形界面）

1. 打开课程页面，点击 OOC 悬浮窗。
2. 进入 **通用 → 全局设置 → 题库配置 → 自定义**。
3. 弹窗顶部切换到 **「AI 配置」** 标签页。
4. 选择供应商，填写 API Key：
   - 供应商支持 **DeepSeek / OpenAI / Anthropic (Claude) / 自定义（OpenAI 兼容）**。
   - 模型名已预填，可以修改。
   - 选择「自定义」时，还需要填写 OpenAI 兼容的接口地址（支持 Base URL，会自动补全）。
5. 点击 **保存 AI 配置**。注意：保存会**覆盖**当前已有的题库配置。
6. 关闭弹窗并刷新页面，先在 **「搜索题目」** 面板手动测试一道题，确认能返回答案后再开启自动答题。

接口地址、请求参数和响应解析规则都由脚本固定，不需要手动填写。再次打开弹窗时会自动回填已保存的供应商和 Key；切换到「手动配置」标签页可以看到生成后的完整 JSON（其中包含明文 Key，请勿分享）。

### 四、手动配置（高级）

如果使用列表之外的厂商，或者想直接编辑完整配置，可以切到 **「手动配置」** 标签页粘贴 JSON：

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

`handler` 是 OOC 约定的函数源码字符串，会以你的登录身份执行。不要使用来源不明的配置。

### 五、省 token 的设计

- **只让模型输出字母**：单选回 `B`，多选回 `ABD`，判断题回 `对`/`错`，避免回显整段选项。
- **JSON 模式**：DeepSeek / OpenAI 使用 `response_format: json_object`，输出稳定为 `{"answer":"B"}`；自定义中转站为避免兼容问题默认不发送该参数，仍通过提示词要求 JSON。
- **动态输出上限**：选择题 40 token，填空/简答 512 token。
- **题目缓存**：OOC 设置中的题目缓存会按题干命中，重复题不再请求模型。

实测一道选择题约消耗 110~120 个输入 token、5 个输出 token。万题量级的成本通常在几元人民币，具体以厂商计费为准。

### 六、切换模型 / 厂商

图形界面已经内置四种供应商：

- **DeepSeek / OpenAI / Anthropic**：选择供应商、填 Key 即可，模型名可改。
- **自定义（OpenAI 兼容）**：额外填写接口地址和模型名；接口地址可以只填 Base URL，脚本会自动补全 `/v1/chat/completions`，也可以直接填完整的 `.../chat/completions`。

需要注意 **`@connect` 白名单**：油猴脚本只能请求脚本头部声明过的域名。目前已内置 `api.deepseek.com`、`api.openai.com`、`api.anthropic.com`。使用中转站或自建地址时，二选一：

1. 修改 `scripts/build-core.js` 中的 `connect` 数组，加入新域名后重新构建；
2. 或在 Tampermonkey 中编辑已安装脚本的元数据，手动添加 `// @connect 你的域名`（脚本更新后会被覆盖）。

如果不用图形界面，也可以在“手动配置”里参照第四节的 JSON，修改 `url`、`headers` 和 `data.model`。Anthropic 的请求格式与 OpenAI 不同（`x-api-key` 头、顶层 `system`、响应在 `content[0].text`），建议直接用 AI 配置标签页生成。

**图片题**：DeepSeek 的 `deepseek-chat` 不支持图片输入。题目含图时需要换成多模态模型（如 Qwen-VL、GLM-4V、gpt-4o-mini 等），并修改 `data.messages` 的 handler，把 `env.images`（base64 数组）拼成 `image_url` 内容块。OOC 已自动完成图片下载与 `[图片N]` 占位符替换。

### 七、常见问题

| 现象 | 排查方向 |
| --- | --- |
| `401 Unauthorized` | Key 错误、过期或复制时带了空格 |
| `402 Insufficient Balance` | 厂商账户余额不足 |
| 请求超时 | 网络或代理问题；OOC 默认超时 60 秒 |
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
