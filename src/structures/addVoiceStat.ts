import { GuildModel, StatClass, UserStatModel } from '@/models';
import { Client } from '@/structures';
import { GuildMember, VoiceChannel } from 'discord.js';
import { RankFlags } from 'src/enums/RankFlags';

const ONE_DAY = 1000 * 60 * 60 * 24;

export async function addVoiceStat(
    client: Client,
    member: GuildMember,
    channel: VoiceChannel,
    value: number,
    guildData: StatClass,
) {
    const query = { id: member.id, guild: member.guild.id };
    const document = (await UserStatModel.findOne(query)) || new UserStatModel(query);
    const now = new Date();

    const diff = now.valueOf() - document.lastDayTime;
    if (diff >= ONE_DAY) document.days += Math.floor(diff / ONE_DAY);

    document.voices.total += value;

    if (!document.voices.channels) document.voices.channels = {};
    if (!document.voices.days) document.voices.days = {};
    if (!document.voices.days[document.days]) document.voices.days[document.days] = { total: 0 };

    if (document.voices.channels[channel.id]) document.voices.channels[channel.id] += value;
    else document.voices.channels[channel.id] = value;

    if (document.voices.days[document.days].total) document.voices.days[document.days].total += value;
    else document.voices.days[document.days].total = value;

    if (document.voices.days[document.days][channel.id]) document.voices.days[document.days][channel.id] += value;
    else document.voices.days[document.days][channel.id] = value;

    document.voices.lastChannel = channel.id;
    document.voices.lastTime = now.valueOf();
    document.lastDayTime = now.setHours(0, 0, 0, 0);

    const newRank = (guildData.ranks || []).find((r) => r.type === RankFlags.Voice && document.voices.total >= r.count);
    if (newRank) {
        if (guildData.removeOldRank) {
            const oldRanks = guildData.ranks.filter((r) => member.roles.cache.has(r.role)).map((r) => r.role);
            if (oldRanks.length) member.roles.remove(oldRanks);
        }
        if (!member.roles.cache.has(newRank.role)) member.roles.add(newRank.role);
    }

    const friends = channel.members.filter((m) => !m.user.bot && m.id !== member.id);
    for (const [id] of friends) {
        if (document.voiceFriends[id]) document.voiceFriends[id] += value;
        else document.voiceFriends[id] = value;
    }

    document.markModified('voices');
    if (friends.size) document.markModified('voiceFriends');
    await document.save();

    if (channel.parentId && guildData.afkRoom !== channel.id && guildData.publicCategory === channel.parentId)
        guildData.dailyPublic += value;
    else if ((guildData.camChannels || []).includes(channel.id)) guildData.dailyCam += value;
    if (
        channel.parentId &&
        guildData.streamCategory === channel.parentId &&
        !(guildData.camChannels || []).includes(channel.id)
    )
        guildData.dailyStream += value;
    else guildData.dailyAfk += value;

    guildData.dailyVoice += value;

    await GuildModel.updateOne({ id: channel.guild.id }, { $set: { stat: guildData } }, { upsert: true });
}
