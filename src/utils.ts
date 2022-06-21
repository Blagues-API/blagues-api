import dayjs from 'dayjs';
import { Snowflake } from 'discord-api-types/v9';
import jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function random<Type = any>(items: Type[]): Type {
  return items[Math.floor(Math.random() * items.length)];
}

export const generateAPIToken = (userId: Snowflake, key: string, limit: number) => {
  return jwt.sign(
    {
      user_id: userId,
      limit,
      key,
      created_at: dayjs().format()
    },
    process.env.JWT_TOKEN!
  );
};

export const generateKey = () => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 50; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
