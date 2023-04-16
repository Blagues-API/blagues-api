import { formatEmoji, Guild, GuildMember, Interaction, Snowflake } from 'discord.js';
import prisma from '../../prisma';
import sharp from 'sharp';
import got from 'got';
import snakeCase from 'lodash/snakeCase';
import { approveEmoji, disapproveEmoji, emojisGuildId } from '../constants';
import { ProposalExtended } from '../../typings';
import { removeNull } from '../../bot/utils';

const rect = Buffer.from('<svg><rect x="0" y="0" width="128" height="128" rx="64" ry="64"/></svg>');

export async function getGodfatherEmoji(emojisGuild: Guild, member: GuildMember) {
  const avatarHash = member.avatar || member.user.avatar;

  const godfather = await prisma.godfather.findUnique({
    select: { emoji_id: true, hash: true },
    where: { user_id: member.id }
  });
  const isEmojiValid =
    godfather?.emoji_id && godfather.hash === avatarHash && emojisGuild.emojis.cache.has(godfather.emoji_id);
  if (isEmojiValid) return formatEmoji(godfather.emoji_id!);

  if (godfather?.emoji_id && emojisGuild.emojis.cache.has(godfather.emoji_id)) {
    await emojisGuild.emojis.delete(godfather.emoji_id);
  }

  const bufferEmoji = await generateAvatarEmoji(member);
  const emoji = await emojisGuild.emojis.create({ name: snakeCase(member.user.username), attachment: bufferEmoji });

  await prisma.godfather.upsert({
    select: { emoji_id: true, hash: true },
    create: {
      user_id: member.id,
      emoji_id: emoji.id,
      hash: avatarHash
    },
    update: {
      emoji_id: emoji.id,
      hash: avatarHash
    },
    where: {
      user_id: member.id
    }
  });

  return formatEmoji(emoji.id);
}

export async function renderGodfatherLine(interaction: Interaction<'cached'>, proposal: ProposalExtended) {
  const emojisGuild = interaction.client.guilds.cache.get(emojisGuildId)!;
  const approvalsIds = proposal.approvals.map((approval) => approval.user_id);
  const disapprovalsIds = proposal.disapprovals.map((disapproval) => disapproval.user_id);

  const godfathersEmojis = new Map<string, string>();
  const godfathersIds = [...new Set([...approvalsIds, ...disapprovalsIds])].filter(removeNull);

  for (const godfathersId of godfathersIds) {
    const member = await interaction.guild.members.fetch(godfathersId).catch(() => null);
    if (!member) continue;
    const emoji = await getGodfatherEmoji(emojisGuild, member);
    if (!emoji) continue;

    godfathersEmojis.set(godfathersId, emoji);
  }

  const approvalsEmojis = approvalsIds.length ? `${approveEmoji} ${mapEmojis(godfathersEmojis, approvalsIds)}` : '';
  const disapprovalsEmojis = disapprovalsIds.length
    ? `${disapproveEmoji} ${mapEmojis(godfathersEmojis, disapprovalsIds)}`
    : '';
  return `${approvalsEmojis} ${disapprovalsEmojis}`.trim();
}

function mapEmojis(emojis: Map<string, string>, users_ids: Snowflake[]) {
  return users_ids
    .map((user_id) => emojis.get(user_id))
    .filter((e) => e)
    .join(' ');
}

async function generateAvatarEmoji(member: GuildMember) {
  const memberAvatar = member.displayAvatarURL({ size: 128, forceStatic: true, extension: 'png' });
  const bufferAvatar = await got(memberAvatar).buffer();
  return sharp(bufferAvatar)
    .composite([{ input: rect, blend: 'dest-in' }])
    .toBuffer();
}
