import { AnyInteraction, Guild, GuildMember, Snowflake } from 'discord.js';
import prisma from '../../prisma';
import sharp from 'sharp';
import got from 'got';
import snakeCase from 'lodash/snakeCase';
import { emojisGuildId } from '../constants';
import { ProposalExtended } from '../../typings';

const approveEmoji = '<:approve:908300630563651615>';
const disapproveEmoji = '<:disapprove:908300630878203954>';

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
    const memberAvatar = member.displayAvatarURL({ size: 128, forceStatic: true, extension: 'png' });
    const bufferAvatar = await got(memberAvatar).buffer();
    const bufferEmoji = await sharp(bufferAvatar)
      .composite([{ input: rect, blend: 'dest-in' }])
      .toBuffer();
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

export async function renderGodfatherLine(interaction: AnyInteraction<'cached'>, proposal: ProposalExtended) {
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
