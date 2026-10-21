// Past newsletters, read from the public Mailchimp campaign archive and cleaned up into
// plain blog-post HTML. Re-sends of the same issue are merged into the original.
import { parse } from 'node-html-parser';

const ARCHIVE_URL = 'https://us12.campaign-archive.com/home/?u=0a5fd5ca7498cd5715ccaa6bc&id=929e2eace3';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

// Optional per-issue tweaks, keyed by the original send date (YYYY-MM-DD)
const ISSUE_EXTRAS = {
  '2026-10-06': { title: 'Kernow Foil Classic 2026: Sun, Swell, and Ryan’s All-Nighters' },
  '2026-09-18': { title: 'AWSI Debrief: Quiet Wind, Loud Industry' },
  '2026-06-04': { title: 'Where We’ve Been: Parawing Sessions and Liam’s ‘Minor’ Reno' },
  '2026-01-28': { number: 7, title: 'Back From New Zealand' }, // sent with the subject "#5" by mistake
  '2026-01-15': { title: 'Tech Words: Mast Stiffness' },
  '2025-12-31': { title: 'Christmas, Sea Dips and a Random Trip to NZ' },
  '2025-12-17': { title: 'A Soup-Fuelled Tangent: Who Do You Believe?' },
  '2025-12-03': { title: 'Session Drought and Lurking on the Buy Button' },
  '2025-11-17': { title: 'Liam Takes the Pen: Kernow, Portugal and Brownies' },
  '2025-11-01': { title: 'Numero Uno: Welcome to the Newsletter' },
};

// Header/footer logo that appears in every issue
const SKIP_IMAGES = [/304d2a86-4359-ecac-1bed-d2f34f769295/, /cdn-images\.mailchimp\.com/];
const FOOTER_TEXT = /unsubscribe|update your preferences|you are receiving this|copyright ©/i;

export default async function handler(req, res) {
  try {
    const archive = await fetchText(ARCHIVE_URL);
    const campaigns = parseArchive(archive);
    const pages = await Promise.all(campaigns.map(c => fetchText(c.url).catch(() => null)));

    const issues = [];
    const seen = new Map();
    // Oldest first, so a re-send is recognised as a copy of the original
    campaigns.map((c, i) => ({ ...c, page: pages[i] }))
      .filter(c => c.page)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(c => {
        const issue = parseIssue(c.page);
        const fingerprint = issue.text.slice(0, 300);
        if (!fingerprint || seen.has(fingerprint)) return;
        seen.set(fingerprint, true);

        const extras = ISSUE_EXTRAS[c.date] || {};
        const number = extras.number ?? Number((c.subject.match(/#(\d+)/) || [])[1]) ?? null;
        issues.push({
          number: number || issues.length + 1,
          date: c.date,
          subject: c.subject,
          title: extras.title || null,
          excerpt: excerpt(issue.text),
          image: issue.leadImage,
          html: issue.html,
          url: c.url,
        });
      });

    issues.sort((a, b) => b.date.localeCompare(a.date));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch newsletters from Mailchimp' });
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
}

// Archive page: one <li class="campaign"> per send, "MM/DD/YYYY - <a>Subject</a>"
export function parseArchive(html) {
  return parse(html).querySelectorAll('li.campaign').map(li => {
    const link = li.querySelector('a');
    const [mm, dd, yyyy] = (li.text.match(/(\d{2})\/(\d{2})\/(\d{4})/) || []).slice(1);
    return { url: link.getAttribute('href'), subject: link.text.trim(), date: `${yyyy}-${mm}-${dd}` };
  }).filter(c => c.url && c.date.length === 10);
}

// Campaign page: walk the content blocks in order and rebuild them as simple HTML
export function parseIssue(html) {
  const root = parse(html);
  const blocks = root.querySelectorAll('.mceTextBlockContainer, img.mceImage, a.mceButtonLink');
  const out = [];
  const seen = new Set(); // emails often carry a second copy of a block for mobile
  let leadImage = null;

  for (const block of blocks) {
    if (block.classList.contains('mceTextBlockContainer')) {
      if (FOOTER_TEXT.test(block.text)) break;
      if (insideTextBlock(block)) continue; // already covered by the outer block
      const cleaned = cleanBlock(block).join('\n');
      if (!cleaned || seen.has(cleaned)) continue;
      seen.add(cleaned);
      out.push(cleaned);
    } else if (block.tagName === 'IMG') {
      const src = block.getAttribute('src');
      if (!src || SKIP_IMAGES.some(re => re.test(src)) || seen.has(src)) continue;
      seen.add(src);
      const link = closestLink(block);
      const isVideo = /video_thumbnails/.test(src) || /youtu/.test(link || '');
      if (!leadImage && !isVideo && !/\.gif/.test(src)) leadImage = src;
      const img = `<img src="${escapeAttr(src)}" alt="" loading="lazy">`;
      out.push(`<figure${isVideo ? ' class="video"' : ''}>${link ? `<a href="${escapeAttr(link)}" target="_blank" rel="noopener">${img}</a>` : img}</figure>`);
    } else {
      const href = block.getAttribute('href');
      const label = block.text.trim();
      if (!href || !label || /campaign-archive/.test(href)) continue;
      out.push(`<p class="button-link"><a href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(label)} &rarr;</a></p>`);
    }
  }

  const html_ = out.join('\n');
  const text = parse(html_).text.replace(/\s+/g, ' ').trim();
  return { html: html_, text, leadImage };
}

function insideTextBlock(node) {
  for (let n = node.parentNode; n && n.tagName; n = n.parentNode) {
    if (n.classList && n.classList.contains('mceTextBlockContainer')) return true;
  }
  return false;
}

function closestLink(node) {
  for (let n = node.parentNode; n && n.tagName; n = n.parentNode) {
    if (n.tagName === 'A' && n.getAttribute('href')) return n.getAttribute('href');
  }
  return null;
}

// Turn one Mailchimp text block into paragraphs, headings and lists
function cleanBlock(block) {
  const results = [];
  const walk = node => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = child.tagName;
      if (tag === 'P' || /^H[1-6]$/.test(tag)) {
        const inner = cleanInline(child).trim();
        if (!inner.replace(/<br>|&nbsp;|\s/g, '')) continue;
        results.push(toBlock(tag, child, inner));
      } else if (tag === 'UL' || tag === 'OL') {
        const items = child.querySelectorAll('li').map(li => cleanInline(li).trim()).filter(Boolean);
        if (items.length) results.push(`<${tag.toLowerCase()}>${items.map(i => `<li>${i}</li>`).join('')}</${tag.toLowerCase()}>`);
      } else {
        walk(child);
      }
    }
  };
  walk(block);
  return results;
}

function toBlock(tag, node, inner) {
  const text = node.text.replace(/\s+/g, ' ').trim();
  const allBold = /^<strong>.*<\/strong>$/.test(inner) && !/<\/strong>.+<strong>/.test(inner);
  const underlined = /text-decoration:\s*underline/.test(node.toString());
  if (/^H[1-6]$/.test(tag) || (allBold && text.length < 70 && (underlined || text === text.toUpperCase()))) {
    return `<h2>${escapeHtml(text)}</h2>`;
  }
  if (allBold && text.length < 70) return `<h3>${inner.replace(/<\/?strong>/g, '')}</h3>`;
  return `<p>${inner}</p>`;
}

function cleanInline(node) {
  let html = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      // Mailchimp merge tags such as {!firstname_fix} or *|FNAME|* only work in the email
      html += escapeHtml(decode(child.rawText).replace(/\{![^}]*\}|\*\|[A-Z_]+\|\*/g, 'Foilers'));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName;
    const inner = cleanInline(child);
    if (tag === 'BR') html += '<br>';
    else if (tag === 'STRONG' || tag === 'B') html += inner.trim() ? `<strong>${inner}</strong>` : inner;
    else if (tag === 'EM' || tag === 'I') html += inner.trim() ? `<em>${inner}</em>` : inner;
    else if (tag === 'A' && child.getAttribute('href')) html += `<a href="${escapeAttr(child.getAttribute('href'))}" target="_blank" rel="noopener">${inner}</a>`;
    else html += inner;
  }
  return html.replace(/<\/strong>(\s*)<strong>/g, '$1');
}

function excerpt(text) {
  const body = text.replace(/^.*?Dearest Foilers,?\s*/i, '');
  if (body.length <= 180) return body;
  return body.slice(0, body.lastIndexOf(' ', 180)).replace(/[\s,.;:–—-]+$/, '') + '…';
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
