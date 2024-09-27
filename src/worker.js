async function fetchLatestRelease() {
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
  return await res.json();
}

export default {
  async fetch(request, env, ctx) {
    const release = await fetchLatestRelease();
    return Response.redirect(release.assets[0].browser_download_url, 302);
  },
};
