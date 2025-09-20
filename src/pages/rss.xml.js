import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const blog = await getCollection('blog');

  return rss({
    title: 'Grotto - Digital Garden & Personal Website',
    description:
      'Ideas, recipes, projects, and musings from a digital garden. Built with slow web principles and a warm, botanical aesthetic.',
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date || post.data.pubDate,
      description: post.data.description || post.data.excerpt || `Read ${post.data.title}`,
      link: `/blog/${post.slug}/`,
      // Include categories/tags if they exist
      categories: post.data.tags || post.data.categories || [],
    })),
    // Optional: RSS feed customization
    customData: `<language>en-us</language>
    <managingEditor>noreply@scholzmx.com (Maximilian Scholz)</managingEditor>
    <webMaster>noreply@scholzmx.com (Maximilian Scholz)</webMaster>`,
  });
}
