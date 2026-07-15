import { getCollection } from 'astro:content';

export async function getCourses() {
	const courses = await getCollection('courses');
	return courses.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}

export function courseSlug(id: string) {
	return id.replace(/\.(yaml|yml)$/i, '');
}
