// Newsletter issue pages: fills in the title, description and picture for the issue being asked for.
import { SITE, get, originOf, applyTags, absolute } from './_share.js';

export default async function handler(req, res) {
  const num = String(req.query?.issue || '');
  const { origin } = originOf(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  let html;
  try { html = await (await get(origin + '/newsletter-issue-template.html')).text(); } catch (e) { return res.status(502).send('This page is unavailable right now. Please try again in a minute.'); }
  try {
    const issues = await (await get(origin + '/api/newsletters')).json();
    const issue = issues.find(i => String(i.number) === num);
    if (!issue) { res.setHeader('Cache-Control', 's-maxage=60'); return res.status(200).send(html); }
    const url = `${SITE}/newsletter-issue?issue=${encodeURIComponent(issue.number)}`;
    const title = issue.title + ' | The Generic Foiling Newsletter';
    const image = absolute(issue.image);
    html = applyTags(html, {
      title, description: issue.excerpt, url, image, alt: issue.title, type: 'article',
      ld: { '@context': 'https://schema.org', '@type': 'Article', headline: issue.title, description: issue.excerpt, image, datePublished: issue.date,
        author: { '@type': 'Organization', name: 'The Generic Foiling Podcast' }, mainEntityOfPage: url },
    });
  } catch (e) { /* the normal page still works */ }
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
