import { GuildModel, StatClass, UserStatModel } from '@/models';
import { Colors, EmbedBuilder, GuildMember, TextChannel, VoiceChannel, inlineCode, roleMention } from 'discord.js';
import { RankFlags } from 'src/enums/RankFlags';

const ONE_DAY = 1000 * 60 * 60 * 24;

export async function addStreamStat(member: GuildMember, channel: VoiceChannel, value: number, guildData: StatClass) {
    const query = { id: member.id, guild: member.guild.id };
    const document = (await UserStatModel.findOne(query)) || new UserStatModel(query);
    const now = new Date();

    const diff = now.valueOf() - document.lastDayTime;
    if (diff >= ONE_DAY) document.days += Math.floor(diff / ONE_DAY);

    document.streams.total += value;

    if (!document.streams.channels) document.streams.channels = {};
    if (!document.streams.days) document.streams.days = {};
    if (!document.streams.days[document.days]) document.streams.days[document.days] = { total: 0 };

    if (document.streams.channels[channel.id]) document.streams.channels[channel.id] += value;
    else document.streams.channels[channel.id] = value;

    if (document.streams.days[document.days].total) document.streams.days[document.days].total += value;
    else document.streams.days[document.days].total = value;

    if (document.streams.days[document.days][channel.id]) document.streams.days[document.days][channel.id] += value;
    else document.streams.days[document.days][channel.id] = value;

    document.streams.lastChannel = channel.id;
    document.streams.lastTime = now.valueOf();
    document.lastDayTime = now.setHours(0, 0, 0, 0);

    const newRank = (guildData.ranks || []).find(
        (r) => r.type === RankFlags.Stream && document.streams.total >= r.count,
    );
    if (newRank) {
        if (guildData.removeOldRank) {
            const oldRanks = guildData.ranks.filter((r) => member.roles.cache.has(r.role)).map((r) => r.role);
            if (oldRanks.length) member.roles.remove(oldRanks);
        }

        if (!member.roles.cache.has(newRank.role)) {
            member.roles.add(newRank.role);

            const logChannel = member.guild.channels.cache.find(c => c.name === 'rank-up') as TextChannel;
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: Colors.Aqua,
                            description: `${member} (${inlineCode(member.id)}) adlı kullanıcıya ${roleMention(newRank.role)} rolü verildi.`
                        })
                    ]
                });
            }
        }
    }

    document.markModified('streams');
    document.save();

    guildData.dailyStreamOpen += value;
    await GuildModel.updateOne(
        { id: channel.guild.id },
        { $set: { 'stat.dailyStreamOpen': guildData.dailyStreamOpen } },
        { upsert: true },
    );
}
