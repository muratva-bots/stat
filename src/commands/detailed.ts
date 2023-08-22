import { IDay, UserStatClass, UserStatModel } from '@/models';
import { EmbedBuilder, Message, bold, inlineCode, italic } from 'discord.js';

const Command: Stat.ICommand = {
    usages: ['detay'],
    checkPermission: ({ message, guildData }) => {
        const minStaffRole = message.guild.roles.cache.get(guildData.minStaffRole);
        return message.member.roles.highest.position >= minStaffRole.position;
    },
    execute: async ({ client, message, args }) => {
        const member = (await client.utils.getMember(message.guild, args[0])) || message.member;

        if (!member) {
            client.utils.sendTimedMessage(message, 'Geçerli bir kullanıcı belirt!');
            return;
        }

        if (member.user.bot) {
            client.utils.sendTimedMessage(message, 'Botların verisi bulunamaz!');
            return;
        }

        const document = await UserStatModel.findOne({ id: member.id, guild: message.guildId });
        if (!document) {
            client.utils.sendTimedMessage(message, 'Veri bulunmuyor.');
            return;
        }

        const argIndex = member.id !== message.author.id ? 1 : 0;
        const wantedDay = args[argIndex] ? Number(args[argIndex]) : document.days;
        if (!wantedDay || 0 >= wantedDay) {
            client.utils.sendTimedMessage(message, 'Geçerli gün sayısı belirt!');
            return;
        }

        if (wantedDay > document.days) {
            client.utils.sendTimedMessage(message, `Kullanıcının ${bold(document.days.toString())} günlük verisi var.`);
            return;
        }

        const now = Date.now();
        const invites = await UserStatModel.find({ inviter: member.id, guild: member.guild.id }).select('id');
        const totalVoiceCategories = getTopCategory(message, document, document.voices.days || {}, wantedDay);
        const totalVoiceChannels = getTopChannels(message, document, document.voices.days || {}, wantedDay);
        const totalMessageChannels = getTopChannels(message, document, document.messages.days || {}, wantedDay);
        const embed = new EmbedBuilder({
            color: client.utils.getRandomColor(),
            description: `${member} (${inlineCode(member.id)}) adlı kullanıcının ${bold(
                `${wantedDay} günlük`,
            )} veri bilgileri;`,
            fields: [
                {
                    name: `Toplam Kategori Sıralaması (${client.utils.numberToString(totalVoiceCategories.total)})`,
                    value: totalVoiceCategories.categories
                        .map(
                            (c, i) =>
                                `${i+1}. ${message.guild.channels.cache.get(c.id)}: ${italic(
                                    client.utils.numberToString(c.value),
                                )}`,
                        )
                        .join('\n'),
                    inline: false,
                },
                {
                    name: `Toplam Kanal Sıralaması (${client.utils.numberToString(totalVoiceChannels.total)})`,
                    value: totalVoiceChannels.channels
                        .map(
                            (c, i) =>
                                `${i+1}. ${message.guild.channels.cache.get(c.id)}: ${italic(
                                    client.utils.numberToString(c.value),
                                )}`,
                        )
                        .join('\n'),
                    inline: false,
                },
                {
                    name: `Toplam Kanal Sıralaması (${totalMessageChannels.total} mesaj)`,
                    value: totalMessageChannels.channels
                        .map(
                            (c, i) =>
                                `${i+1}. ${message.guild.channels.cache.get(c.id)}: ${italic(
                                    `${c.value} mesaj`,
                                )}`,
                        )
                        .join('\n'),
                    inline: false,
                },
                {
                    name: 'Diğer Bilgiler',
                    value: [
                        `${inlineCode('・')} Toplam Kayıt: ${italic(
                            `${
                                document.registers.filter(
                                    (register) => now - register.time > 1000 * 60 * 60 * 24 * wantedDay,
                                ).length
                            } kayıt`,
                        )}`,
                        `${inlineCode('・')} Toplam Davet: ${italic(
                            `${
                                invites.filter(
                                    (d) =>
                                        message.guild.members.cache.has(d.id) &&
                                        wantedDay > now - message.guild.members.cache.get(d.id).joinedTimestamp &&
                                        now - message.guild.members.cache.get(d.id).user.createdTimestamp >
                                            1000 * 60 * 60 * 7,
                                ).length
                            } davet`,
                        )}`,
                        `${inlineCode('・')} Toplam Tag Aldırma: ${italic(
                            `${
                                document.taggeds.filter(
                                    (register) => now - register.time > 1000 * 60 * 60 * 24 * wantedDay,
                                ).length
                            } taglı aldırma`,
                        )}`,
                        `${inlineCode('・')} Toplam Çekilen Yetkili: ${italic(
                            `${
                                document.staffTakes.filter(
                                    (register) => now - register.time > 1000 * 60 * 60 * 24 * wantedDay,
                                ).length
                            } yetkili`,
                        )}`,
                    ].join('\n'),
                    inline: false,
                },
            ],
        });

        message.channel.send({
            embeds: [embed],
        });
    },
};

export default Command;

function getTopChannels(message: Message, document: UserStatClass, days: IDay, day: number) {
    const channelStats = {};
    let total = 0;
    Object.keys(days)
        .filter((d) => day > document.days - Number(d))
        .forEach((d) =>
            Object.keys(days[d]).forEach((channelId) => {
                const channel = message.guild.channels.cache.get(channelId);
                if (!channel) return;

                if (!channelStats[channelId]) channelStats[channelId] = 0;
                channelStats[channelId] += days[d][channelId];
                total += days[d][channelId];
            }),
        );

    return {
        channels: Object.keys(channelStats)
            .sort((a, b) => channelStats[b] - channelStats[a])
            .map((c) => ({ id: c, value: channelStats[c] }))
            .slice(0, 10),
        total,
    };
}

function getTopCategory(message: Message, document: UserStatClass, days: IDay, day: number) {
    const channelStats = {};
    let total = 0;
    Object.keys(days)
        .filter((d) => day > document.days - Number(d))
        .forEach((d) =>
            Object.keys(days[d]).forEach((channelId) => {
                const channel = message.guild.channels.cache.get(channelId);
                if (!channel || !channel.parentId) return;

                if (!channelStats[channel.parentId]) channelStats[channel.parentId] = 0;
                channelStats[channel.parentId] += days[d][channel.id];
                total += days[d][channel.id];
            }),
        );

    return {
        categories: Object.keys(channelStats)
            .sort((a, b) => channelStats[b] - channelStats[a])
            .map((c) => ({ id: c, value: channelStats[c] }))
            .slice(0, 10),
        total,
    };
}
