import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '~/data/site';

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: site.name + ' Blog',
    description: 'Free PDF tips, study strategies, and exam prep for Indian students.',
    site: context.site ?? site.siteUrl + site.basePath,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>en-IN</language>`,
  });
}
