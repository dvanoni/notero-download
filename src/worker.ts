import type { components } from '@octokit/openapi-types';

type Release = components['schemas']['release'];

async function fetchLatestDownloadUrl(): Promise<string | null> {
  const res = await fetch(
    'https://api.github.com/repos/dvanoni/notero/releases/latest',
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'notero-download',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  const json = await res.json();
  if (typeof json !== 'object' || json === null || !('assets' in json)) {
    return null;
  }
  const release = json as Release;
  return release.assets[0]?.browser_download_url || null;
}

export default {
  async fetch(request, env, ctx) {
    const downloadUrl = await fetchLatestDownloadUrl();
    if (!downloadUrl) {
      return new Response('Failed to fetch latest release', { status: 500 });
    }
    return Response.redirect(downloadUrl, 302);
  },
} satisfies ExportedHandler<Env>;
