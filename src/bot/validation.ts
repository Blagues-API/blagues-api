import { Client } from 'discord.js'
import { everyoneRole, parrainRole } from './constants';

export default class Validation {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async register(): Promise<void> {
    const cmd = await this.client.application?.commands.create({
      name: 'Validation',
      type: 3
    })

    await cmd!.permissions.add({guild: '642681003642716160' , permissions: [
      {
        id: everyoneRole,
        type: 1,
        permission: false,
      },
      {
        id: parrainRole,
        type: 1,
        permission: true,
      }]
    })
  }
}
