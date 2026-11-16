import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Maximilian Scholz · Blog',
    description:
      'Long-form writing by Maximilian Scholz on Bayesian statistics, simulation studies, R and open source.',
    site: context.site,
    // Post pages are served as directories, so their address ends in a slash.
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags ?? [],
    })),
    customData: `<language>en</language>
    <managingEditor>noreply@scholzmx.com (Maximilian Scholz)</managingEditor>
    <webMaster>noreply@scholzmx.com (Maximilian Scholz)</webMaster>`,
  });
}
