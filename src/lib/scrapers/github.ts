import { Octokit } from 'octokit';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function fetchGitHubRepoContent(owner: string, repo: string, path: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    
    if (Array.isArray(data)) {
        return data.map(file => ({ name: file.name, path: file.path, type: file.type }));
    }
    
    if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString('utf8');
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching GitHub content:', error);
    return null;
  }
}
