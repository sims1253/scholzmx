import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const blog = await getCollection('blog');
  const sortedBlog = blog
    .filter((post) => !post.data.draft)
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return rss({
    title: 'Grotto - Digital Garden & Personal Website',
    description:
      'Ideas, recipes, projects, and musings from a digital garden. Built with slow web principles and a warm, botanical aesthetic.',
    site: context.site!, // `site` is guaranteed by astro.config.mjs
    items: sortedBlog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}`,
      categories: post.data.tags ?? [],
    })),
    customData: `<language>en-us</language>
    <managingEditor>noreply@scholzmx.com (Maximilian Scholz)</managingEditor>
    <webMaster>noreply@scholzmx.com (Maximilian Scholz)</webMaster>`,
  });
}
