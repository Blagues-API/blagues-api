import { Octokit } from '@octokit/rest';
import { stripIndents } from 'common-tags';
import { Client } from 'discord.js';
import { readFileSync } from 'fs';
import schedule from 'node-schedule';

interface GitCommitPushOptions {
  owner: string;
  repo: string;
  file: {
    path: string;
    content: string;
  };
  baseBranch: string;
  mergeBranch: string;
}

type Status = 201 | 204 | 403 | 404 | 409 | 422;

export class AutoPublish {
  public client: Client;
  private options: GitCommitPushOptions;
  private octokit: Octokit;

  constructor(client: Client) {
    this.client = client;
    this.options = {
      owner: process.env.GITHUB_OWNER ?? 'blagues-api',
      repo: process.env.GITHUB_REPO ?? 'blagues-api',
      file: { path: 'blagues.json', content: readFileSync('./blagues.json', 'utf-8') },
      baseBranch: process.env.GITHUB_BASE_BRANCH ?? 'dev',
      mergeBranch: process.env.GITHUB_MERGE_BRANCH ?? 'chore/autopublish-jokes'
    };

    this.octokit = new Octokit({
      auth: process.env.GITHUB_API_TOKEN
    });

    if (process.env.JOKES_AUTO_PUBLICATION === 'false') return;

    // At 00:00 on Monday
    schedule.scheduleJob('0 0 * * 1', () => this.run());
  }

  async run() {
    const [referenceSha, blobSha] = await Promise.all([this.#getReferenceCommit(), this.#createBlob()]);
    const treeSha = await this.#createTree(referenceSha, blobSha);
    const commitSha = await this.#createCommit(treeSha, referenceSha);
    const branchSha = await this.#createReference(commitSha);

    const mergeBranch = await this.#mergeReference(branchSha);

    return this.#responseWithStatus[mergeBranch.status]();
  }

  async #getReferenceCommit(): Promise<string> {
    const response = await this.octokit.git.getRef({
      owner: this.options.owner,
      repo: this.options.repo,
      ref: `heads/${this.options.baseBranch}`
    });
    return response.data.object.sha;
  }

  async #createBlob(): Promise<string> {
    const blob = await this.octokit.git.createBlob({
      owner: this.options.owner,
      repo: this.options.repo,
      content: this.options.file.content,
      encoding: 'utf-8'
    });
    return blob.data.sha;
  }

  async #createTree(referenceSha: string, blobSha: string): Promise<string> {
    const tree = await this.octokit.git.createTree({
      owner: this.options.owner,
      repo: this.options.repo,
      tree: [
        {
          sha: blobSha,
          path: this.options.file.path,
          mode: '100644',
          type: 'blob'
        }
      ],
      base_tree: referenceSha
    });

    return tree.data.sha;
  }

  async #createCommit(treeSha: string, referenceSha: string): Promise<string> {
    const commit = await this.octokit.git.createCommit({
      owner: this.options.owner,
      repo: this.options.repo,
      message: 'chore: 💬 Add last added jokes',
      tree: treeSha,
      parents: [referenceSha]
    });

    return commit.data.sha;
  }

  async #createReference(commitSha: string): Promise<string> {
    const branch = await this.octokit.git.createRef({
      owner: this.options.owner,
      repo: this.options.repo,
      ref: `refs/heads/${this.options.mergeBranch}`,
      sha: commitSha
    });

    return branch.data.ref;
  }

  async #mergeReference(branchSha: string) {
    return this.octokit.rest.repos.merge({
      owner: this.options.owner,
      repo: this.options.repo,
      base: this.options.baseBranch,
      head: branchSha,
      commit_message: 'Merge des dernières blagues'
    });
  }

  #responseWithStatus: Record<Status, () => void> = {
    '201': () => console.log('[Auto-Publish] Publication des blagues sur Github effectuée avec succès !'),
    '204': () => console.log('[Auto-Publish] Publication des blagues sur Github déjà effectuée !'),
    '403': () =>
      console.log(`[Auto-Publish] Permission d'accès manquante au repo "${this.options.owner}/${this.options.repo}"`),
    '404': () => console.error(`[Auto-Publish] Branche "${this.options.baseBranch}" introuvable !`),
    '409': () => {
      this.octokit.pulls.create({
        owner: this.options.owner,
        repo: this.options.repo,
        title: "[Blagues] Conflit lors de l'ajout des dernières blagues",
        head: this.options.mergeBranch,
        base: this.options.baseBranch,
        body: stripIndents`
          ⚠️ Conflit détectée lors de l'ajout des dernières blagues !

          Veuillez résoudre ces conflits afin de fusionner la branche manuellement :)
        `,
        maintainer_can_modify: true
      });
      console.error(
        `[Auto-Publish] Conflit détecté lors de la publication des blagues sur Github !\n Une Pull-Request a été créée.`
      );
    },
    '422': () =>
      console.error(
        '[Auto-Publish] Un ratelimit est survenu, la publication des blagues sur Github a été reportée à dimanche prochain !'
      )
  };
}
