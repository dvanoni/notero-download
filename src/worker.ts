import type { components } from '@octokit/openapi-types';

type Release = components['schemas']['release'];

const CACHE_TTL = 300; // 5 minutes

function logRateLimitHeaders(res: Response) {
  const headers = Array.from(res.headers.entries());
  const rateLimitHeaders = headers.filter(([key]) =>
    key.startsWith('x-ratelimit'),
  );
  console.log(Object.fromEntries(rateLimitHeaders));
}

async function fetchLatestDownloadUrl(): Promise<string | null> {
  console.log('Fetching latest release');
  const res = await fetch(
    'https://api.github.com/repos/dvanoni/notero/releases/latest',
    {
      cf: {
        cacheTtlByStatus: { '200-299': CACHE_TTL, 404: 1, '500-599': 0 },
      },
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dvanoni/notero-download',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  logRateLimitHeaders(res);
  const json = await res.json();
  if (typeof json !== 'object' || json === null || !('assets' in json)) {
    return null;
  }
  const release = json as Release;
  return release.assets[0]?.browser_download_url || null;
}

async function buildResponse(): Promise<Response> {
  let downloadUrl = await fetchLatestDownloadUrl();
  if (!downloadUrl) {
    console.warn('Failed to fetch latest release');
    downloadUrl = 'https://github.com/dvanoni/notero/releases/latest';
  }
  let response = Response.redirect(downloadUrl, 302);
  response = new Response(response.body, response);
  response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/') {
      return new Response('Not found', { status: 404 });
    }

    const cacheKey = url.toString();
    const cache = caches.default;

    let response = await cache.match(cacheKey);

    if (response) {
      console.log(`Cache hit for: ${request.url}`);
    } else {
      console.log(`Cache miss for: ${request.url}`);
      response = await buildResponse();
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
