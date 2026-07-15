import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = process.cwd();
const courseDir = path.join(root, 'src', 'content', 'courses');
const publicDir = path.join(root, 'public');
const materialRoot = path.join(publicDir, 'materials');
const errors = [];
const courseOrders = new Map();
const publicCopyGuards = [
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

function isNonEmptyString(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

function validateLocalized(value, label) {
	if (!value || typeof value !== 'object') {
		addError(`${label} must contain en and zh values.`);
		return;
	}
	if (!isNonEmptyString(value.en)) addError(`${label}.en is required.`);
	if (!isNonEmptyString(value.zh)) addError(`${label}.zh is required.`);
}

function walkSize(directory) {
	if (!fs.existsSync(directory)) return 0;
	let total = 0;
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);
		total += entry.isDirectory() ? walkSize(fullPath) : fs.statSync(fullPath).size;
	}
	return total;
}

if (!fs.existsSync(courseDir)) {
	addError('Missing src/content/courses directory.');
} else {
	const files = fs.readdirSync(courseDir).filter((file) => /\.ya?ml$/i.test(file)).sort();
	if (files.length === 0) addError('At least one course manifest is required.');

	for (const file of files) {
		const slug = file.replace(/\.ya?ml$/i, '');
		const label = `Course ${slug}`;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
			addError(`${label}: filename must be a lowercase URL-safe slug.`);
		}

		let course;
		try {
			course = YAML.parse(fs.readFileSync(path.join(courseDir, file), 'utf8'));
		} catch (error) {
			addError(`${label}: invalid YAML (${error.message}).`);
			continue;
		}

		if (!Number.isInteger(course?.order) || course.order < 1) {
			addError(`${label}: order must be a positive integer.`);
		} else if (courseOrders.has(course.order)) {
			addError(`${label}: order ${course.order} is already used by ${courseOrders.get(course.order)}.`);
		} else {
			courseOrders.set(course.order, slug);
		}

		validateLocalized(course?.title, `${label}.title`);
		validateLocalized(course?.description, `${label}.description`);

		const publicText = JSON.stringify({ title: course?.title, description: course?.description });
		for (const guard of publicCopyGuards) {
			if (guard.test(publicText)) addError(`${label}: public course copy contains restricted wording (${guard}).`);
		}

		if (!Array.isArray(course?.resources)) {
			addError(`${label}: resources must be an array.`);
			continue;
		}

		const resourceOrders = new Map();
		const resourcePaths = new Set();
		for (const [index, resource] of course.resources.entries()) {
			const resourceLabel = `${label}.resources[${index}]`;
			if (!Number.isInteger(resource?.order) || resource.order < 1) {
				addError(`${resourceLabel}: order must be a positive integer.`);
			} else if (resourceOrders.has(resource.order)) {
				addError(`${resourceLabel}: duplicate order ${resource.order}.`);
			} else {
				resourceOrders.set(resource.order, true);
			}

			validateLocalized(resource?.title, `${resourceLabel}.title`);
			if (resource?.description !== undefined) {
				validateLocalized(resource.description, `${resourceLabel}.description`);
			}

			if (!isNonEmptyString(resource?.path)) {
				addError(`${resourceLabel}: path is required.`);
				continue;
			}
			if (resource.path.startsWith('/') || resource.path.includes('..') || resource.path.includes('\\')) {
				addError(`${resourceLabel}: path must be a safe relative POSIX path.`);
				continue;
			}
			if (!/\.(pdf|html)$/i.test(resource.path)) {
				addError(`${resourceLabel}: only .pdf and .html entry files are supported.`);
			}
			if (resourcePaths.has(resource.path)) {
				addError(`${resourceLabel}: duplicate path ${resource.path}.`);
			}
			resourcePaths.add(resource.path);

			if (resource.updated !== undefined) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(resource.updated) || Number.isNaN(Date.parse(`${resource.updated}T00:00:00Z`))) {
					addError(`${resourceLabel}: updated must be a valid YYYY-MM-DD date.`);
				}
			}

			const fullPath = path.resolve(materialRoot, slug, resource.path);
			const courseMaterialDir = path.resolve(materialRoot, slug);
			if (!fullPath.startsWith(`${courseMaterialDir}${path.sep}`)) {
				addError(`${resourceLabel}: path escapes the course material directory.`);
			} else if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
				addError(`${resourceLabel}: referenced file does not exist at public/materials/${slug}/${resource.path}.`);
			} else if (/\.html$/i.test(resource.path)) {
				const html = fs.readFileSync(fullPath, 'utf8');
				for (const guard of publicCopyGuards) {
					if (guard.test(html)) addError(`${resourceLabel}: HTML material contains restricted wording (${guard}).`);
				}
				for (const match of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) {
					const reference = match[1].split(/[?#]/, 1)[0];
					if (!reference || /^(?:https?:|data:|mailto:|javascript:|\/)/i.test(reference)) continue;
					const referencedFile = path.resolve(path.dirname(fullPath), decodeURIComponent(reference));
					if (!fs.existsSync(referencedFile)) {
						addError(`${resourceLabel}: missing linked HTML asset ${reference}.`);
					}
				}
			}
		}
	}
}

const publicSize = walkSize(publicDir);
if (publicSize >= 1_000_000_000) {
	addError(`Public files total ${(publicSize / 1_000_000_000).toFixed(2)} GB, exceeding the GitHub Pages 1 GB limit.`);
}

if (errors.length > 0) {
	console.error('Content validation failed:');
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(`Content validation passed (${courseOrders.size} course, ${(publicSize / 1_000_000).toFixed(2)} MB public files).`);
