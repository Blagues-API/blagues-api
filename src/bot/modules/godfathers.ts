import { Guild, GuildMember, Interaction, Snowflake } from 'discord.js';
import prisma from '../../prisma';
import sharp from 'sharp';
import got from 'got';
import snakeCase from 'lodash/snakeCase';
import { emojisGuildId, approveEmoji, disapproveEmoji } from '../constants';
import { ProposalExtended, ReportExtended } from '../../typings';

interface GodfatherEmoji {
  id: Snowflake;
  emoji: `<:vote:${Snowflake}>`;
}

const rect = Buffer.from('<svg><rect x="0" y="0" width="128" height="128" rx="64" ry="64"/></svg>');

export async function getGodfatherEmoji(emojisGuild: Guild, member: GuildMember): Promise<GodfatherEmoji> {
  let godfather = await prisma.godfather.findUnique({
    where: { user_id: member.id }
  });
  if (!godfather) {
    const bufferEmoji = await generateEmoji(member);
    const emoji = await emojisGuild.emojis.create({ name: snakeCase(member.displayName), attachment: bufferEmoji });
    godfather = await prisma.godfather.create({
      data: {
        user_id: member.id,
        emoji_id: emoji.id
      }
    });
  }
  if (!emojisGuild.emojis.cache.has(godfather.emoji_id)) {
    await prisma.godfather.delete({ where: { id: godfather.id } });
    return getGodfatherEmoji(emojisGuild, member);
  }
  return { id: member.id, emoji: `<:vote:${godfather.emoji_id}>` };
}

export async function renderGodfatherLine(
  interaction: Interaction<'cached'>,
  proposal: ProposalExtended | ReportExtended
) {
  const emojisGuild = interaction.client.guilds.cache.get(emojisGuildId)!;
  const approvalsIds = proposal.approvals.map((approval) => approval.user_id);
  const disapprovalsIds = proposal.disapprovals.map((disapproval) => disapproval.user_id);

  const members = await Promise.all(
    [...new Set([...approvalsIds, ...disapprovalsIds])].map((user_id) =>
      interaction.guild.members.fetch(user_id).catch(() => null)
    )
  );
  const godfathersEmojis = await Promise.all(
    members.filter((m) => m).map((member) => getGodfatherEmoji(emojisGuild, member!))
  );

  const approvalsEmojis = approvalsIds.length ? `${approveEmoji} ${mapEmojis(godfathersEmojis, approvalsIds)}` : '';
  const disapprovalsEmojis = disapprovalsIds.length
    ? `${disapproveEmoji} ${mapEmojis(godfathersEmojis, disapprovalsIds)}`
    : '';
  return `${approvalsEmojis} ${disapprovalsEmojis}`.trim();
}

function mapEmojis(emojis: GodfatherEmoji[], users_ids: Snowflake[]) {
  return users_ids
    .map((user_id) => emojis.find((godfather) => godfather.id === user_id)?.emoji)
    .filter((e) => e)
    .join(' ');
}

export async function updateGodfatherEmoji(member: GuildMember) {
  const godfather = await prisma.godfather.findUnique({
    where: { user_id: member.id }
  });
  const bufferEmoji = await generateEmoji(member);
  const newEmoji = await member.guild.emojis.create({ name: snakeCase(member.displayName), attachment: bufferEmoji });
  if (godfather) {
    const oldEmoji = member.guild.emojis.cache.get(godfather.emoji_id);
    if (oldEmoji) await oldEmoji.delete();
    await prisma.godfather.update({
      where: {
        user_id: member.id
      },
      data: {
        emoji_id: newEmoji.id
      }
    });
  } else {
    return prisma.godfather.create({
      data: {
        user_id: member.id,
        emoji_id: newEmoji.id
      }
    });
  }
}

async function generateEmoji(member: GuildMember) {
  const memberAvatar = member.displayAvatarURL({ size: 128, forceStatic: true, extension: 'png' });
  const bufferAvatar = await got(memberAvatar).buffer();
  return sharp(bufferAvatar)
    .composite([{ input: rect, blend: 'dest-in' }])
    .toBuffer();
}
