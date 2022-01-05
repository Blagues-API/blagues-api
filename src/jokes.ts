import { constants as fsConstants, promises as fs } from 'fs';
import { Correction, Joke, Suggestion } from './typings';
import path from 'path';

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

  private async init() {
    const jokesPath = path.join(__dirname, '../blagues.json');
    try {
      await fs.access(jokesPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      console.log('Missing access', error);
      return { success: false, error: `Il semblerait que le fichier de blagues soit inaccessible ou innexistant.` };
    }

    const rawData = await fs.readFile(jokesPath, 'utf-8');
    const jokes = (rawData.length ? JSON.parse(rawData) : []) as Joke[];
    this.list = jokes;
    this.count = jokes.length;
  }

  public async mergeJoke(
    proposal: Correction | Suggestion
  ): Promise<{ success: boolean; joke_id?: number; error?: string }> {
    const jokesPath = path.join(__dirname, '../blagues.json');
    try {
      await fs.access(jokesPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      console.log('Missing access', error);
      return { success: false, error: `Il semblerait que le fichier de blagues soit inaccessible ou innexistant.` };
    }

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
}

export default new JokesLoader();
