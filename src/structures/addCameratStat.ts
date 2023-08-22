import { GuildModel, StatClass, UserStatModel } from '@/models';
import { GuildMember, VoiceChannel } from 'discord.js';
import { RankFlags } from 'src/enums/RankFlags';

const ONE_DAY = 1000 * 60 * 60 * 24;

export async function addCameraStat(member: GuildMember, channel: VoiceChannel, value: number, guildData: StatClass) {
    const query = { id: member.id, guild: member.guild.id };
    const document = (await UserStatModel.findOne(query)) || new UserStatModel(query);
    const now = new Date();

    const diff = now.valueOf() - document.lastDayTime;
    if (diff >= ONE_DAY) document.days += Math.floor(diff / ONE_DAY);

    document.cameras.total += value;

    if (!document.cameras.channels) document.cameras.channels = {};
    if (!document.cameras.days) document.cameras.days = {};
    if (!document.cameras.days[document.days]) document.cameras.days[document.days] = { total: 0 };

    if (document.cameras.channels[channel.id]) document.cameras.channels[channel.id] += value;
    else document.cameras.channels[channel.id] = value;

    if (document.cameras.days[document.days].total) document.cameras.days[document.days].total += value;
    else document.cameras.days[document.days].total = value;

    if (document.cameras.days[document.days][channel.id]) document.cameras.days[document.days][channel.id] += value;
    else document.cameras.days[document.days][channel.id] = value;

    document.cameras.lastChannel = channel.id;
    document.cameras.lastTime = now.valueOf();
    document.lastDayTime = now.setHours(0, 0, 0, 0);

    const newRank = (guildData.ranks || []).find(
        (r) => r.type === RankFlags.Camera && document.cameras.total >= r.count,
    );
    if (newRank) {
        if (guildData.removeOldRank) {
            const oldRanks = guildData.ranks.filter((r) => member.roles.cache.has(r.role)).map((r) => r.role);
            if (oldRanks.length) member.roles.remove(oldRanks);
        }
        if (!member.roles.cache.has(newRank.role)) member.roles.add(newRank.role);
    }

    document.markModified('cameras');
    document.save();

    guildData.dailyCamOpen += value;
    await GuildModel.updateOne(
        { id: channel.guild.id },
        { $set: { 'stat.dailyStreamOpen': guildData.dailyCamOpen } },
        { upsert: true },
    );
}
