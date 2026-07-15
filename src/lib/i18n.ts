export type Locale = 'en' | 'zh';
export type Section = 'home' | 'about' | 'teaching' | 'contact';

export const profile = {
	name: 'Ray',
	affiliation: {
		en: 'Renmin University of China',
		zh: '中国人民大学',
	},
	role: {
		en: 'PhD student in Economics',
		zh: '经济学博士生',
	},
	research: {
		en: 'Labor economics and development economics, with a focus on the Chinese labor market.',
		zh: '劳动经济学与发展经济学，重点关注中国劳动力市场。',
	},
	email: 'seankoray@163.com',
} as const;

export const navItems = {
	en: [
		{ key: 'home', label: 'Home', path: '/' },
		{ key: 'about', label: 'About', path: '/about/' },
		{ key: 'teaching', label: 'Teaching', path: '/teaching/' },
		{ key: 'contact', label: 'Contact', path: '/contact/' },
	],
	zh: [
		{ key: 'home', label: '首页', path: '/' },
		{ key: 'about', label: '关于', path: '/about/' },
		{ key: 'teaching', label: '教学', path: '/teaching/' },
		{ key: 'contact', label: '联系', path: '/contact/' },
	],
} as const;

export function localePath(locale: Locale, path: string): string {
	if (locale === 'en') return path;
	return path === '/' ? '/zh/' : `/zh${path}`;
}
