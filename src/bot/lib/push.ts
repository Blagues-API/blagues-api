import { Octokit } from '@octokit/rest';

async function getReferenceCommit(octokit: Octokit, options: GitCommitPushOptions) {
  const response = await octokit.git.getRef({
    owner: options.owner,
    repo: options.repo,
    ref: `heads/${options.baseBranch}`
  });
  return response.data.object.sha;
}

async function createTree(octokit: Octokit, options: GitCommitPushOptions, sha: string) {
  const blob = await octokit.git.createBlob({
    owner: options.owner,
    repo: options.repo,
    content: options.file.content,
    encoding: 'utf-8'
  });

  const tree = await octokit.git.createTree({
    owner: options.owner,
    repo: options.repo,
    tree: [
      {
        sha: blob.data.sha,
        path: options.file.path,
        mode: '100644',
        type: 'blob'
      }
    ],
    base_tree: sha
  });
  return tree.data.sha;
}

interface CommitPayload {
  treeSha: string;
  referenceSha: string;
}

async function createCommit(octokit: Octokit, options: GitCommitPushOptions, payload: CommitPayload) {
  const commit = await octokit.git.createCommit({
    owner: options.owner,
    repo: options.repo,
    message: 'chore: 💬 Add last added jokes',
    tree: payload.treeSha,
    parents: [payload.referenceSha]
  });

  return commit.data.sha;
}

async function createReference(octokit: Octokit, options: GitCommitPushOptions, commitSha: string) {
  const branch = await octokit.git.createRef({
    owner: options.owner,
    repo: options.repo,
    ref: `refs/heads/${options.mergeBranch}`,
    sha: commitSha
  });

  return branch.data.ref;
}

async function mergeReference(octokit: Octokit, options: GitCommitPushOptions, branchSha: string) {
  try {
    await octokit.rest.repos.merge({
      owner: options.owner,
      repo: options.repo,
      base: `${options.baseBranch}`,
      head: branchSha,
      commit_message: 'Merge des dernières blagues'
    });
  } catch (error) {
    console.error(error);
    // TODO: Créer la pull request uniquement si le code d'erreur match bien
    await octokit.pulls.create({
      owner: options.owner,
      repo: options.repo,
      title: "[Blagues] Conflit lors de l'ajout des dernières blagues",
      head: options.mergeBranch,
      base: options.baseBranch,
      body: `\`\`\`${error}\`\`\``,
      maintainer_can_modify: true
    });
  }
}

export interface GitCommitPushOptions {
  owner: string;
  repo: string;
  file: {
    path: string;
    content: string;
  };
  baseBranch: string;
  mergeBranch: string;
}

export async function gitCommitPush(options: GitCommitPushOptions) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_API_TOKEN
  });

  const referenceSha = await getReferenceCommit(octokit, options);
  const treeSha = await createTree(octokit, options, referenceSha);
  const commitSha = await createCommit(octokit, options, { referenceSha, treeSha });

  const branchSha = await createReference(octokit, options, commitSha);
  await mergeReference(octokit, options, branchSha);
}
