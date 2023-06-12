import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import prisma from './prisma';
import { Correction, Joke, Suggestion } from './typings';

import { AsyncQueue } from '@sapphire/async-queue';

class JokesLoader {
  public count: number;
  public list: Joke[];

  private loader: AsyncQueue;

  constructor() {
    this.count = 0;
    this.list = [];

    this.loader = new AsyncQueue();

    this.init();
  }

  public async mergeJoke(
    proposal: Correction | Suggestion
  ): Promise<{ success: boolean; joke_id?: number; error?: string }> {
    const jokesPath = path.join(__dirname, '../blagues.json');
    const req = await this.checkAccess(jokesPath);

    if (!req.success) return req;

    try {
      await this.loader.wait();

      const rawData = await fs.readFile(jokesPath, 'utf-8');
      const jokes = (rawData.length ? JSON.parse(rawData) : []) as Joke[];

      const index =
        proposal.type === 'CORRECTION'
          ? jokes.findIndex((joke) => joke.id === proposal.suggestion.joke_id!)
          : jokes.length;
      const joke_id = proposal.type === 'CORRECTION' ? proposal.suggestion.joke_id! : jokes[jokes.length - 1].id + 1;
      const joke = {
        id: joke_id,
        type: proposal.joke_type,
        joke: proposal.joke_question,
        answer: proposal.joke_answer
      } as Joke;
      jokes.splice(index, proposal.type === 'CORRECTION' ? 1 : 0, joke);

      this.list = jokes;
      this.count = jokes.length;

      await fs.writeFile(jokesPath, JSON.stringify(jokes, null, 2));

      return { success: true, joke_id };
    } catch (error) {
      console.log('Error:', error);
      return { success: false, error: `Une erreur s'est produite lors de l'ajout de la blague.` };
    } finally {
      this.loader.shift();
    }
  }

  public async deleteJoke(joke: Joke): Promise<{ success: boolean; joke_id?: number; error?: string }> {
    const jokesPath = path.join(__dirname, '../blagues.json');
    const req = await this.checkAccess(jokesPath);

    if (!req.success) return req;

    try {
      await this.loader.wait();

      const rawData = await fs.readFile(jokesPath, 'utf-8');
      const jokes = (rawData.length ? JSON.parse(rawData) : []) as Joke[];
      const jokeToDelete = jokes.find((j) => j.id === joke.id)!;
      if (!jokeToDelete) return { success: false, error: `La blague n'a pas été trouvée.` };

      const deleteIndex = jokes.indexOf(jokeToDelete);
      if (deleteIndex === -1) return { success: false, error: `La blague n'a pas été trouvée.` };

      const [lastJoke] = jokes.splice(-1, 1);
      jokes[deleteIndex] = { ...lastJoke, id: deleteIndex };

      await prisma.proposal.update({
        where: { joke_id: jokes.at(-1)!.id },
        data: { joke_id: jokeToDelete.id }
      });

      this.list = jokes;
      this.count = jokes.length;

      await fs.writeFile(jokesPath, JSON.stringify(jokes, null, 2));

      return { success: true };
    } catch (error) {
      console.log('Error:', error);
      return { success: false, error: `Une erreur s'est produite lors de la suppression de la blague.` };
    } finally {
      this.loader.shift();
    }
  }

  private async init() {
    const jokesPath = path.join(__dirname, '../blagues.json');
    const req = await this.checkAccess(jokesPath);

    if (!req.success) return req;

    const rawData = await fs.readFile(jokesPath, 'utf-8');
    const jokes = (rawData.length ? JSON.parse(rawData) : []) as Joke[];
    this.list = jokes;
    this.count = jokes.length;
  }

  private async checkAccess(path: string) {
    try {
      await fs.access(path, fsConstants.R_OK | fsConstants.W_OK);
      return { success: true };
    } catch (error) {
      console.log('Missing access', error);
      return { success: false, error: `Il semblerait que le fichier de blagues soit inaccessible ou inexistant.` };
    }
  }
}

export default new JokesLoader();
