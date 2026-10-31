import type { AnswererWrapper } from '@ocsjs/core';

/** AI 供应商 ID */
export type AIProviderId = 'deepseek' | 'openai' | 'anthropic' | 'custom';

/** 供应商使用的请求协议 */
export type AIProtocol = 'openai' | 'anthropic';

export interface AIProviderPreset {
	id: AIProviderId;
	label: string;
	protocol: AIProtocol;
	/** 官方接口地址；custom 为空，由用户填写 */
	url: string;
	/** 默认模型 */
	model: string;
	homepage: string;
}

/** 预置供应商（custom 仅支持 OpenAI 兼容协议） */
export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
	{
		id: 'deepseek',
		label: 'DeepSeek',
		protocol: 'openai',
		url: 'https://api.deepseek.com/chat/completions',
		model: 'deepseek-chat',
		homepage: 'https://platform.deepseek.com'
	},
	{
		id: 'openai',
		label: 'OpenAI',
		protocol: 'openai',
		url: 'https://api.openai.com/v1/chat/completions',
		model: 'gpt-4o-mini',
		homepage: 'https://platform.openai.com'
	},
	{
		id: 'anthropic',
		label: 'Anthropic (Claude)',
		protocol: 'anthropic',
		url: 'https://api.anthropic.com/v1/messages',
		model: 'claude-3-5-haiku-latest',
		homepage: 'https://console.anthropic.com'
	},
	{
		id: 'custom',
		label: '自定义（OpenAI 兼容）',
		protocol: 'openai',
		url: '',
		model: 'gpt-4o-mini',
		homepage: ''
	}
];

export interface AIConfigState {
	provider: AIProviderId;
	apiKey: string;
	/** 仅 custom 使用：用户填写的接口地址 */
	baseUrl?: string;
	model?: string;
}

/** AI 生成的题库配置会带上这些标记字段，便于再次打开弹窗时回填表单 */
export interface AIAnswererWrapper extends AnswererWrapper {
	aiProvider?: AIProviderId;
	aiBaseUrl?: string;
	aiModel?: string;
}

const SYSTEM_PROMPT =
	'只输出JSON：{"answer":"答案"}。单选题只答选项字母；多选题字母连写（如ABC）；判断题只答“对”或“错”，禁止答字母；填空简答答答案文本。';

const USER_CONTENT_EXPR =
	"'题型：' + (env.type === 'judgement' ? '判断题，只答对或错，禁止答字母' : env.type) + '。题目：' + env.title + (env.options ? ' 选项：' + env.options : '')";

/** 选择题输出很短，填空/简答需要更长的输出上限；由 env.options 判断 */
const MAX_TOKENS_HANDLER = 'return (env) => env.options ? 40 : 512';

/** 从模型返回文本中提取 {"answer":"..."}，解析失败时回退为原始文本 */
const ANSWER_PARSER_BODY =
	'const s = TEXT.trim(); let j = null; try { j = JSON.parse(s); } catch (e) {} const a = j && j.answer ? String(j.answer) : s; return [a, a];';

function buildOpenAIWrapper(params: {
	preset: AIProviderPreset;
	apiKey: string;
	url: string;
	model: string;
	useJsonMode: boolean;
}): AIAnswererWrapper {
	const { preset, apiKey, url, model, useJsonMode } = params;
	return {
		name: 'AI 搜题(' + preset.label + ')',
		homepage: preset.homepage || undefined,
		url,
		method: 'post',
		type: 'GM_xmlhttpRequest',
		responseType: 'json',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + apiKey
		},
		data: {
			model,
			temperature: 0,
			max_tokens: { handler: MAX_TOKENS_HANDLER },
			...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
			messages: {
				handler:
					"return (env) => [{role:'system',content:'" +
					SYSTEM_PROMPT +
					"'},{role:'user',content:" +
					USER_CONTENT_EXPR +
					'}]'
			}
		},
		handler: 'return (res) => { ' + ANSWER_PARSER_BODY.replace('TEXT', 'res.choices[0].message.content') + ' }',
		aiProvider: preset.id,
		aiModel: model
	};
}

function buildAnthropicWrapper(params: {
	preset: AIProviderPreset;
	apiKey: string;
	url: string;
	model: string;
}): AIAnswererWrapper {
	const { preset, apiKey, url, model } = params;
	return {
		name: 'AI 搜题(' + preset.label + ')',
		homepage: preset.homepage || undefined,
		url,
		method: 'post',
		type: 'GM_xmlhttpRequest',
		responseType: 'json',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			// 允许在浏览器环境直接调用（GM_xmlhttpRequest 本身不受 CORS 限制，带上更稳妥）
			'anthropic-dangerous-direct-browser-access': 'true'
		},
		data: {
			model,
			temperature: 0,
			max_tokens: { handler: MAX_TOKENS_HANDLER },
			system: SYSTEM_PROMPT,
			messages: {
				handler: "return (env) => [{role:'user',content:" + USER_CONTENT_EXPR + '}]'
			}
		},
		handler:
			'return (res) => { ' +
			ANSWER_PARSER_BODY.replace('TEXT', "(res.content || []).map((b) => b.text || '').join('')") +
			' }',
		aiProvider: preset.id,
		aiModel: model
	};
}

/**
 * 补全 OpenAI 兼容接口地址：
 * - 已是 /chat/completions 结尾：原样使用
 * - 以 /v1 结尾：追加 /chat/completions
 * - 其它 Base URL：追加 /v1/chat/completions
 */
export function normalizeOpenAIEndpoint(input: string): string {
	const url = input.trim().replace(/\/+$/, '');
	if (!url) return '';
	if (/\/chat\/completions$/i.test(url)) return url;
	if (/\/v1$/i.test(url)) return url + '/chat/completions';
	return url + '/v1/chat/completions';
}

/** 根据表单状态生成标准 AnswererWrapper */
export function buildAIAnswererWrapper(state: AIConfigState): AIAnswererWrapper {
	const preset = AI_PROVIDER_PRESETS.find((p) => p.id === state.provider) || AI_PROVIDER_PRESETS[0];
	const model = (state.model || preset.model).trim();
	const apiKey = state.apiKey.trim();

	if (preset.protocol === 'anthropic') {
		return buildAnthropicWrapper({ preset, apiKey, url: preset.url, model });
	}

	const url = preset.id === 'custom' ? normalizeOpenAIEndpoint(state.baseUrl || '') : preset.url;
	const wrapper = buildOpenAIWrapper({
		preset,
		apiKey,
		url,
		model,
		// 自定义中转站不一定支持 response_format，避免请求被拒
		useJsonMode: preset.id !== 'custom'
	});
	if (preset.id === 'custom') wrapper.aiBaseUrl = state.baseUrl?.trim() || '';
	return wrapper;
}

/** 从已保存的题库配置中识别 AI 配置并还原表单状态；未找到返回 undefined */
export function parseAIAnswererWrapper(wrappers: AnswererWrapper[] | undefined): AIConfigState | undefined {
	for (const raw of wrappers || []) {
		const wrapper = raw as AIAnswererWrapper;
		if (!wrapper.aiProvider) continue;
		const headerKey = wrapper.headers?.['x-api-key'] || wrapper.headers?.Authorization || '';
		return {
			provider: wrapper.aiProvider,
			apiKey: headerKey.replace(/^Bearer\s+/i, ''),
			baseUrl: wrapper.aiBaseUrl || (wrapper.aiProvider === 'custom' ? wrapper.url : ''),
			model: wrapper.aiModel || ''
		};
	}
	return undefined;
}
