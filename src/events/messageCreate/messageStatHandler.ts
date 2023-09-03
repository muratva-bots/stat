import { GuildModel, StatClass, UserStatModel } from '@/models';
import { Colors, EmbedBuilder, Message, TextChannel, inlineCode, roleMention } from 'discord.js';
import { RankFlags } from 'src/enums/RankFlags';

const ONE_DAY = 1000 * 60 * 60 * 24;

async function messageStatHandler(message: Message, guildData: StatClass) {
    if (message.author.bot || !message.guild) return;

    if (message.channelId === guildData.generalChat) guildData.dailyGeneral++;
    guildData.dailyMessage++;

    const now = new Date();
    const guildDiff = now.valueOf() - guildData.lastDay;
    if (guildDiff >= ONE_DAY) guildData.days += Math.floor(guildDiff / ONE_DAY);
    guildData.lastDay = now.setHours(0, 0, 0, 0);
    await GuildModel.updateOne({ id: message.guildId }, { $set: { stat: guildData } }, { upsert: true });

    const query = { id: message.author.id, guild: message.guildId };
    const document = (await UserStatModel.findOne(query)) || new UserStatModel(query);

    const userDiff = now.valueOf() - document.lastDayTime;
    if (userDiff >= ONE_DAY) document.days += Math.floor(userDiff / ONE_DAY);

    const channel = message.channel as TextChannel;
    document.messages.total += 1;

    if (!document.messages.channels) document.messages.channels = {};
    if (!document.messages.days) document.messages.days = {};
    if (!document.messages.days[document.days]) document.messages.days[document.days] = { total: 0 };

    if (document.messages.channels[channel.id]) document.messages.channels[channel.id] += 1;
    else document.messages.channels[channel.id] = 1;

    if (document.messages.days[document.days].total) document.messages.days[document.days].total += 1;
    else document.messages.days[document.days].total = 1;

    if (document.messages.days[document.days][channel.id]) document.messages.days[document.days][channel.id] += 1;
    else document.messages.days[document.days][channel.id] = 1;

    document.messages.lastMessage = {
        channelId: channel.id,
        messageId: message.id,
        createdTimestamp: message.createdTimestamp,
    };
    document.lastDayTime = now.setHours(0, 0, 0, 0);

    const newRank = (guildData.ranks || []).find(
        (r) => r.type === RankFlags.Message && document.messages.total >= r.count,
    );
    if (newRank) {
        if (guildData.removeOldRank) {
            const oldRanks = guildData.ranks.filter((r) => message.member.roles.cache.has(r.role)).map((r) => r.role);
            if (oldRanks.length) message.member.roles.remove(oldRanks);
        }
        if (!message.member.roles.cache.has(newRank.role)) {
            message.member.roles.add(newRank.role);

            const logChannel = message.guild.channels.cache.find(c => c.name === 'rank-up') as TextChannel;
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: Colors.Aqua,
                            description: `${message.member} (${inlineCode(message.member.id)}) adlı kullanıcıya ${roleMention(newRank.role)} rolü verildi.`
                        })
                    ]
                });
            }
        }
    }

    const reference = message.reference ? (await message.fetchReference()).author : undefined;
    const friends = [...message.mentions.users.values(), reference].filter(
        (u) => u && !u.bot && u.id !== message.author.id,
    );
    for (const friend of friends) {
        if (document.chatFriends[friend.id]) document.chatFriends[friend.id] += 1;
        else document.chatFriends[friend.id] = 1;
    }

    if (friends.length) document.markModified('chatFriends');
    document.markModified('messages');
    await document.save();
}

export default messageStatHandler;
