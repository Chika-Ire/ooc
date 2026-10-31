/* eslint-disable max-len */
import { h, $ui } from 'easy-us';
import type { AnswererWrapper } from '@ocsjs/core';

/**
 * OOC 通用 UI 组件库
 *
 * 本文件存放题库配置弹窗等场景复用的展示组件与图标资源，与项目业务状态解耦：
 * 组件不直接读写 CommonProject 等全局状态，所需数据/行为通过参数注入。
 *
 * 配套样式：packages/scripts/assets/less/custom.less（.aw-* 前缀类名）
 */

/**
 * OOC 图标 SVG（唯一数据源）
 * - entry.js 标题栏使用（经 index.ts 导出后从脚本全局对象解构）
 * - edge-minimize.ts 边缘最小化图标模式使用
 */
export const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" style="vertical-align:middle;"><rect width="64" height="64" rx="14" fill="#1677ff"/><text x="32" y="42" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">OOC</text></svg>`;

/** 加载中旋转图标（旋转动画由 custom.less 的 .aw-spin 控制） */
export const loadingSpinSvg = `<svg class="aw-spin" width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg>`;

/** 题库启用/停用状态接入（由调用方提供，避免组件与项目状态耦合） */
/**
 * 通用口风琴卡片（下拉展开/收起列表组件）
 *
 * 结构：头部（点击整行展开/收起）+ 详情区（默认收起），展开状态由 expanded class 驱动，
 * 样式见 custom.less 的 .accordion-card-*（含详情区超高时内部滚动的 scroll 样式）。
 *
 * 使用方：题库配置卡片（createAnswererWrapperList）、搜索结果下拉列表（search.infos.ts）
 */
export function createAccordionCard(options: {
	/** 头部左侧内容 */
	header: (HTMLElement | string)[];
	/** 头部右侧内容（位于展开箭头左侧，如开关/标签） */
	headerTrailing?: (HTMLElement | string)[];
	/** 详情区内容 */
	body: (HTMLElement | string)[];
	/** 默认是否展开 */
	expanded?: boolean;
	/** 卡片附加 class */
	className?: string;
}): HTMLElement {
	const card = h('div', {
		className:
			'accordion-card' + (options.className ? ' ' + options.className : '') + (options.expanded ? ' expanded' : '')
	});
	const header = h('div', { className: 'accordion-card-header' }, [
		...options.header,
		h('span', { className: 'accordion-card-spacer' }),
		...(options.headerTrailing ?? []),
		h('span', { className: 'accordion-card-chevron', innerHTML: CHEVRON_SVG })
	]);
	header.onclick = () => card.classList.toggle('expanded');
	card.append(header, h('div', { className: 'accordion-card-body' }, options.body));
	return card;
}

export interface AnswererListHandlers {
	/** 判断题库是否已停用 */
	isDisabled: (name: string) => boolean;
	/** 切换题库启用/停用（disabled=true 表示切换后为停用状态） */
	onToggle: (name: string, disabled: boolean) => void;
}

/** 展开箭头 SVG（代替 details/summary 的默认箭头，旋转动画由 CSS 控制） */
const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * 题库配置卡片列表
 *
 * 每个题库渲染为可展开卡片：
 * - 头部：名称 + 接口域名徽标 + 启停开关 + 展开箭头，点击整行展开/收起
 * - 详情：对齐的键值行（名字/官网/接口/请求方法/请求类型/请求头/请求体）
 * - 展开/收起、停用半透明等交互通过 class（expanded / disabled）驱动，样式见 custom.less
 */
export function createAnswererWrapperList(aw: AnswererWrapper[], handlers: AnswererListHandlers): HTMLElement[] {
	/** 对齐的键值行：标签列固定宽度，值自动换行 */
	const row = (label: string, value: string | HTMLElement) =>
		h('li', { className: 'aw-card-row' }, [
			h('span', { className: 'aw-card-label' }, label),
			h('span', { className: 'aw-card-value' }, [value])
		]);

	return aw.map((item) => {
		/** 启用/停用开关 */
		const checkbox = h('input', {
			type: 'checkbox',
			checked: !handlers.isDisabled(item.name),
			className: 'base-style-switch'
		});
		checkbox.title = '点击停用或者启用题库，停用题库后将无法在自动答题中查询题目';
		const switchWrapper = $ui.tooltip(checkbox);
		// 注意：$ui.tooltip 返回同一元素（switchWrapper === checkbox），
		// onclick 只能赋值一次（分两次赋值后者会覆盖前者，曾导致启停逻辑丢失、刷新后恢复原值）
		checkbox.onclick = (e) => {
			// 阻止冒泡，避免触发卡片展开/收起
			e.stopPropagation();
			const disabled = !checkbox.checked;
			card.classList.toggle('disabled', disabled);
			handlers.onToggle(item.name, disabled);
		};

		/** 接口域名徽标 */
		const host = (() => {
			try {
				return new URL(item.url).hostname;
			} catch {
				return item.url;
			}
		})();

		/** 主页图标：点击进入题库主页（阻止冒泡，避免触发卡片展开） */
		const hasHomepage = !!item.homepage && item.homepage !== '#';
		const homeLink = h(
			'a',
			{
				className: 'aw-card-home' + (hasHomepage ? '' : ' no-home'),
				href: hasHomepage ? item.homepage! : 'javascript:void(0)',
				target: '_blank',
				title: hasHomepage ? '前往题库首页' : '此题库未配置首页'
			},
			'🏠'
		);
		homeLink.onclick = (e) => e.stopPropagation();

		/** 卡片头：主页图标 + 名称 + 域名徽标 + 右侧开关 + 箭头，点击整行展开/收起 */
		const card = createAccordionCard({
			className: 'aw-card' + (handlers.isDisabled(item.name) ? ' disabled' : ''),
			header: [
				homeLink,
				h('span', { className: 'aw-card-name' }, item.name),
				h('span', { className: 'aw-card-badge', title: item.url }, host)
			],
			headerTrailing: [switchWrapper],
			body: [
				h('ul', { className: 'aw-card-rows' }, [
					row('名字', item.name),
					row(
						'官网',
						h('span', {
							innerHTML: `<a target="_blank" href=${item.homepage}>${item.homepage || '无'}</a>`
						})
					),
					row('接口', item.url),
					row('请求方法', item.method),
					row('请求类型', item.type),
					row('请求头', JSON.stringify(item.headers, null, 4) || '无'),
					row('请求体', JSON.stringify(item.data, null, 4) || '无')
				])
			]
		});

		return card;
	});
}

/**
 * 题库配置渲染区：标题 + 复制按钮（右对齐）+ 卡片列表
 * @param aw 题库配置数组
 * @param title 标题
 * @param handlers 题库启停状态接入
 * @param withCopy 是否显示「复制题库配置」按钮
 */
export function createAnswererWrapperSection(
	aw: AnswererWrapper[],
	title: string,
	handlers: AnswererListHandlers,
	withCopy = true
): HTMLElement {
	/** 复制按钮：普通按钮样式（小尺寸），右对齐 */
	const copyBtn = withCopy ? $ui.copy('复制题库配置', JSON.stringify(aw, null, 4)) : undefined;
	if (copyBtn) {
		copyBtn.className = 'modal-cancel-button aw-section-copy';
	}
	return h('div', [
		h('div', { className: 'aw-section-header' }, [h('b', title), ...(copyBtn ? [copyBtn] : [])]),
		...createAnswererWrapperList(aw, handlers)
	]);
}

/**
 * 「⋯」题库配置获取方式下拉按钮
 *
 * 悬浮显示下拉框（官方题库 / 自定义题库），点击选项直接打开对应配置弹窗：
 * - 弹窗打开函数由题库配置按钮（answererWrappersButton）的 onload 暴露在 provider 上
 * - 未暴露时兜底触发主按钮点击（默认官方一键获取）
 * - 定位：右对齐「⋯」按钮；面板下方空间不足时自动向上弹出
 */
export function createAnswererModeDropdown(): HTMLElement {
	const dropdown = h('dropdown-element');
	// 必须在插入文档前设置，connectedCallback 会根据该值绑定事件
	// hover 触发：鼠标悬浮「⋯」按钮显示，移开（含点击其他区域）自动隐藏
	dropdown.trigger = 'hover';
	dropdown.triggerElement = h(
		'button',
		{
			className: 'base-style-button-secondary',
			style: { marginLeft: '4px', padding: '4px 12px' }
		},
		'⋯'
	);

	// flex 布局消除 inline-block 行盒的基线空隙，使内容区与按钮底部零间隙衔接
	dropdown.style.display = 'inline-flex';

	// 下拉框定位：右对齐「⋯」按钮，避免超出面板宽度被 overflow:auto 裁剪并撑出横向滚动条
	const content = dropdown.content;
	content.style.top = '100%';
	content.style.right = '0';
	content.style.left = 'auto';

	/** 面板下方空间不足时向上弹出，避免撑出面板纵向滚动条 */
	const refreshPosition = () => {
		const panel = dropdown.closest('script-panel-element');
		if (!panel) return;
		const flipUp =
			dropdown.triggerElement.getBoundingClientRect().bottom + content.offsetHeight >
			panel.getBoundingClientRect().bottom;
		content.style.top = flipUp ? 'auto' : '100%';
		content.style.bottom = flipUp ? '100%' : 'auto';
	};
	// 悬浮展开后重算弹出方向（库在 mouseenter 时添加 show，延迟到下一帧再计算）
	dropdown.triggerElement.addEventListener('mouseenter', () => {
		setTimeout(() => {
			if (content.classList.contains('show')) refreshPosition();
		});
	});

	const options: Record<'official' | 'custom', HTMLDivElement> = {
		official: $ui.tooltip(
			h(
				'div',
				{
					className: 'dropdown-option',
					title: '打开官方题库获取弹窗，登录题库网站后自动回填配置，无需手动复制粘贴'
				},
				'官方题库'
			)
		),
		custom: $ui.tooltip(
			h('div', { className: 'dropdown-option', title: '打开手动配置弹窗，手动填写或粘贴题库配置' }, '自定义题库')
		)
	};
	/** 点击选项直接打开对应配置弹窗（主按钮默认官方一键获取，自定义题库仅从此处进入） */
	const openAnswererModal = (mode: 'official' | 'custom') => {
		const configEl = dropdown.closest('config-element') as
			| (HTMLElement & {
					provider?: HTMLElement & {
						openAnswererModal?: (mode: 'official' | 'custom') => void;
					};
			  })
			| null;
		// onload 回调的 this 指向 provider，openAnswererModal 暴露在 provider 上
		const provider = configEl?.provider;
		// 优先调用暴露的打开函数（可指定模式），兜底触发主按钮点击（默认官方）
		if (provider?.openAnswererModal) {
			provider.openAnswererModal(mode);
		} else {
			provider?.click();
		}
	};
	options.official.onclick = () => openAnswererModal('official');
	options.custom.onclick = () => openAnswererModal('custom');
	dropdown.content.append(options.official, options.custom);
	return dropdown;
}

/**
 * 步骤指示器（① → ② → ③）
 * @param items 步骤文案列表
 */
export function createSteps(items: string[]): HTMLElement {
	const children: (HTMLElement | string)[] = [];
	items.forEach((text, i) => {
		children.push(h('span', { className: 'aw-step' }, [h('span', { className: 'aw-step-num' }, String(i + 1)), text]));
		if (i < items.length - 1) {
			children.push(h('span', { className: 'aw-step-arrow' }, '→'));
		}
	});
	return h('div', { className: 'aw-steps' }, children);
}

/** 状态提示类型：info 进行中 / success 成功 / error 失败 */
export type StatusType = 'info' | 'success' | 'error';

/**
 * 状态提示框（默认隐藏，setStatus 后显示并按类型着色）
 * @returns el 状态框元素；setStatus 更新文本与类型
 */
export function createStatusBox(): { el: HTMLElement; setStatus: (text: string, type: StatusType) => void } {
	const el = h('div', { className: 'aw-connect-status' });
	const setStatus = (text: string, type: StatusType) => {
		el.innerHTML = text;
		el.className = 'aw-connect-status ' + type;
	};
	return { el, setStatus };
}

/** Hero 头部配置 */
export interface HeroOptions {
	/** 图标（emoji 文本） */
	icon: string;
	/** 主标题 */
	title: string;
	/** 副标题说明 */
	subtitle: string;
	/** 额外信息行（如题库源与官网链接） */
	extra?: HTMLElement | string;
}

/**
 * Hero 头部（简洁浅色底 + 居中图标/标题/副标题 + 可选附加信息行）
 */
export function createHero(opts: HeroOptions): HTMLElement {
	return h('div', { className: 'aw-connect-hero' }, [
		h('div', { className: 'aw-connect-hero-icon' }, opts.icon),
		h('div', { className: 'aw-connect-hero-title' }, opts.title),
		h('div', { className: 'aw-connect-hero-subtitle' }, opts.subtitle),
		...(opts.extra ? [h('div', { className: 'aw-connect-hero-extra' }, [opts.extra])] : [])
	]);
}
