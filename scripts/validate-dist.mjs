import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const errors = [];
const expectedPages = [
	'index.html',
	'about/index.html',
	'teaching/index.html',
	'teaching/behavioral-economics/index.html',
	'contact/index.html',
	'zh/index.html',
	'zh/about/index.html',
	'zh/teaching/index.html',
	'zh/teaching/behavioral-economics/index.html',
	'zh/contact/index.html',
	'404.html',
];
const restrictedPublicCopy = [
	new RegExp(['School', 'of', 'Economics'].join(' '), 'i'),
	new RegExp(['中国人民大学', '经济学院'].join(''), 'u'),
	new RegExp(['one', 'on', 'one'].join('[ -]'), 'i'),
	new RegExp(['一', '对', '一'].join(''), 'u'),
	new RegExp(['Beamer', 'generated'].join('[ -]'), 'i'),
	new RegExp(['interactive', 'HTML', 'slides'].join(' '), 'i'),
];

function addError(message) {
	errors.push(message);
}

function walk(directory, extension) {
	if (!fs.existsSync(directory)) return [];
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(directory, entry.name);
		return entry.isDirectory() ? walk(fullPath, extension) : (!extension || fullPath.endsWith(extension) ? [fullPath] : []);
	});
}

function resolveLocalHref(href) {
	const clean = decodeURIComponent(href.split(/[?#]/, 1)[0]);
	if (!clean.startsWith('/')) return null;
	const relative = clean.replace(/^\/+/, '');
	if (relative === '') return path.join(dist, 'index.html');
	const direct = path.join(dist, relative);
	if (path.extname(relative)) return direct;
	return path.join(direct, 'index.html');
}

if (!fs.existsSync(dist)) {
	addError('Missing dist directory. Run the Astro build first.');
} else {
	for (const page of expectedPages) {
		if (!fs.existsSync(path.join(dist, page))) addError(`Missing generated page: ${page}`);
	}

	const htmlFiles = walk(dist, '.html');
	const combinedHtml = htmlFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

	for (const file of htmlFiles) {
		const relative = path.relative(dist, file);
		const html = fs.readFileSync(file, 'utf8');
		const isCourseMaterial = relative.startsWith(`materials${path.sep}`);
		if (!isCourseMaterial) {
			if (!/<html lang="(?:en|zh-CN)">/.test(html)) addError(`${relative}: missing supported html lang value.`);
			if (!/<main id="main-content">/.test(html)) addError(`${relative}: missing main content landmark.`);
			if (!/<nav aria-label="[^"]+">/.test(html)) addError(`${relative}: missing labelled primary navigation.`);
			if (!/<link rel="canonical" href="https:\/\/seankoray\.github\.io\//.test(html)) addError(`${relative}: missing canonical URL.`);
			if (!/hreflang="en"/.test(html) || !/hreflang="zh-CN"/.test(html)) addError(`${relative}: missing language alternates.`);
			const h1Count = (html.match(/<h1(?:\s[^>]*)?>/g) ?? []).length;
			if (h1Count !== 1) addError(`${relative}: expected exactly one h1, found ${h1Count}.`);
		}

		for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
			const href = match[1];
			if (/^(?:https?:|mailto:|#)/.test(href)) continue;
			const target = resolveLocalHref(href);
			if (target && !fs.existsSync(target)) addError(`${relative}: broken local link ${href}.`);
		}
	}

	for (const guard of restrictedPublicCopy) {
		if (guard.test(combinedHtml)) addError(`Generated site contains restricted public wording (${guard}).`);
	}
	for (const required of ['Renmin University of China', '中国人民大学', 'seankoray@163.com']) {
		if (!combinedHtml.includes(required)) addError(`Generated site is missing required public content: ${required}`);
	}

	const sitemapExists = ['sitemap-index.xml', 'sitemap-0.xml', 'sitemap.xml'].some((file) => fs.existsSync(path.join(dist, file)));
	if (!sitemapExists) addError('Sitemap was not generated.');
}

if (errors.length > 0) {
	console.error('Built-site validation failed:');
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log('Built-site validation passed: routes, metadata, local links, privacy wording, and sitemap are valid.');
