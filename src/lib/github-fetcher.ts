export async function fetchGitHubRepoLinks() {
  const url = 'https://api.github.com/repos/Kirankumar8728/official-group-links/contents/';
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const contents = await res.json();
    if (!Array.isArray(contents)) return [];
    
    // Assuming the links are in files, let's find .txt or .md files?
    // User said: "implement this auto fetch logics from that but dont add manual platforms"
    
    // For now, let's just return the list of file names/paths for the user to see or process
    return contents.map((c: any) => ({
      name: c.name,
      url: c.download_url
    }));
  } catch (e) {
    console.error('Failed to fetch from GitHub:', e);
    return [];
  }
}
