import { IDay, StatClass, UserStatClass, UserStatModel } from '@/models';
import { Client } from '@/structures';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionFlagsBits,
    Role,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';

const titles = {
    all: 'Tüm zamanların bilgileri',
    weekly: 'Haftalık bilgiler',
    monthly: 'Aylık bilgiler',
};

type IType = 'all' | 'weekly' | 'monthly';

const Command: Stat.ICommand = {
    usages: ['denetim'],
    checkPermission: ({ message }) => message.member.permissions.has(PermissionFlagsBits.Administrator),
    execute: async ({ client, message, args, guildData }) => {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) {
            client.utils.sendTimedMessage(message, 'Geçerli bir rol belirt.');
            return;
        }

        const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>({
            components: [
                new StringSelectMenuBuilder({
                    custom_id: 'type',
                    placeholder: 'Bakacağınız zaman dilimini seçin!',
                    options: [
                        { label: 'Tüm Zamanlar', value: 'all' },
                        { label: 'Haftalık', value: 'weekly' },
                        { label: 'Aylık', value: 'monthly' },
                    ],
                }),
            ],
        });

        const question = await message.channel.send({
            components: [typeRow],
        });

        const filter = (i: StringSelectMenuInteraction) => i.user.id === message.author.id;
        const collector = await question.createMessageComponentCollector({
            filter,
            componentType: ComponentType.StringSelect,
        });

        collector.on('collect', (i: StringSelectMenuInteraction) => {
            collector.stop('FINISHED');
            i.deferUpdate();
            pageHandler(client, message, question, role, i.values[0] as IType, guildData);
        });

        collector.on('collect', (_, reason) => {
            if (reason === 'time') question.delete();
        });
    },
};

export default Command;

async function pageHandler(
    client: Client,
    message: Message,
    question: Message,
    role: Role,
    type: 'all' | 'weekly' | 'monthly',
    guildData: StatClass,
) {
    let page = 1;
    const members = [...message.guild.members.cache.filter((m) => m.roles.cache.has(role.id) && !m.user.bot).values()];
    const embed = new EmbedBuilder({
        color: client.utils.getRandomColor(),
        footer: {
            text: `Rolde ${members.length} üye bulunuyor. ・ ${titles[type]} gösteriliyor.`,
        },
    });

    const firstContent = await getMemberContent(client, members[0], type, guildData);
    question.edit({
        embeds: [
            embed
                .setAuthor({
                    name: members[0].user.displayName,
                    iconURL: members[0].user.displayAvatarURL({ size: 4096, forceStatic: true }),
                })
                .setDescription(firstContent.length ? null : 'Veri bulunmuyor.')
                .setFields(firstContent),
        ],
        components: members.length > 1 ? [client.utils.paginationButtons(page, members.length)] : [],
    });

    const filter = (i: ButtonInteraction) => i.user.id === message.author.id;
    const collector = await question.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        i.deferUpdate();

        if (i.customId === 'first') page = 1;
        if (i.customId === 'previous') page -= 1;
        if (i.customId === 'next') page += 1;
        if (i.customId === 'last') page = members.length;

        const content = await getMemberContent(client, members[page - 1], type, guildData);
        question.edit({
            embeds: [
                embed
                    .setAuthor({
                        name: members[page - 1].user.displayName,
                        iconURL: members[page - 1].user.displayAvatarURL({ size: 4096, forceStatic: true }),
                    })
                    .setDescription(content.length ? null : 'Veri bulunmuyor.')
                    .setFields(content),
            ],
            components: [client.utils.paginationButtons(page, members.length)],
        });
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            const timesUp = new ActionRowBuilder<ButtonBuilder>({
                components: [
                    new ButtonBuilder({
                        custom_id: 'times-up',
                        disabled: true,
                        emoji: { name: '⏱️' },
                        label: 'Mesajın Süresi Doldu.',
                        style: ButtonStyle.Danger,
                    }),
                ],
            });

            question.edit({ components: [timesUp] });
        }
    });
}

async function getMemberContent(client: Client, member: GuildMember, type: IType, guildData: StatClass) {
    const document = await UserStatModel.findOne({ id: member.id, guild: member.guild.id });
    if (!document) return [];

    const invites = await UserStatModel.find({ inviter: member.id, guild: member.guild.id }).select('id');
    const now = Date.now();
    const voiceChannels = document.voices.channels || {};
    const messageChannels = document.messages.channels || {};
    const streamChannels = document.streams.channels || {};
    const cameraChannels = document.cameras.channels || {};
    const isStreamChannel = (channelId) =>
        member.guild.channels.cache.has(channelId) &&
        member.guild.channels.cache.get(channelId).parentId === guildData.streamCategory &&
        !guildData.camChannels.includes(channelId);

    const totalMessages =
        type === 'all'
            ? document.messages.total
            : getChannelDaysTotal(document, document.messages.days, type, () => true);

    const totalVoices =
        type === 'all' ? document.voices.total : getChannelDaysTotal(document, document.voices.days, type, () => true);

    const totalVoiceStreams =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter((channelId) => isStreamChannel(channelId))
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(document, document.voices.days, type, isStreamChannel);

    const totalStreams =
        type === 'all'
            ? Object.keys(streamChannels)
                .filter((channelId) => isStreamChannel(channelId))
                .reduce((totalCount, channelId) => totalCount + streamChannels[channelId], 0)
            : getChannelDaysTotal(document, document.streams.days, type, isStreamChannel);

    const totalVoiceCameras =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter((channelId) => (guildData.camChannels || []).includes(channelId))
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(document, document.voices.days, type, (channelId) =>
                (guildData.camChannels || []).includes(channelId),
            );

    const totalCameras =
        type === 'all'
            ? Object.keys(cameraChannels)
                .filter((channelId) => (guildData.camChannels || []).includes(channelId))
                .reduce((totalCount, channelId) => totalCount + cameraChannels[channelId], 0)
            : getChannelDaysTotal(document, document.cameras.days, type, (channelId) =>
                (guildData.camChannels || []).includes(channelId),
            );

    const totalVoiceStaffTake =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter(
                    (channelId) =>
                        member.guild.channels.cache.has(channelId) &&
                        member.guild.channels.cache.get(channelId).parentId === guildData.staffTakeCategory,
                )
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(document, document.voices.days, type, (channelId) =>
            (guildData.camChannels || []).includes(channelId),
            );

    const totalStaffTakes =
        type === 'all'
            ? document.staffTakes.length
            : document.staffTakes.filter(
                (staffTake) => now - staffTake.time > 1000 * 60 * 60 * 24 * (type === 'weekly' ? 7 : 30),
            ).length;

    const totalVoiceProblemResolve =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter(
                    (channelId) =>
                        member.guild.channels.cache.has(channelId) &&
                        member.guild.channels.cache.get(channelId).parentId === guildData.problemResolveCategory,
                )
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.voices.days,
                type,
                (channelId) =>
                    member.guild.channels.cache.has(channelId) &&
                    member.guild.channels.cache.get(channelId).parentId === guildData.problemResolveCategory,
            );

    const totalProblemResolves =
        type === 'all'
            ? document.problemResolves.length
            : document.problemResolves.filter(
                (staffTake) => now - staffTake.createdTimestamp > 1000 * 60 * 60 * 24 * (type === 'weekly' ? 7 : 30),
            ).length;

    const totalVoiceRegister =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter(
                    (channelId) =>
                        member.guild.channels.cache.has(channelId) &&
                        member.guild.channels.cache.get(channelId).parentId === guildData.registerCategory,
                )
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.voices.days,
                type,
                (channelId) =>
                    member.guild.channels.cache.has(channelId) &&
                    member.guild.channels.cache.get(channelId).parentId === guildData.registerCategory,
            );

    const totalRegister =
        type === 'all'
            ? document.registers.length
            : document.registers.filter(
                (register) => now - register.time > 1000 * 60 * 60 * 24 * (type === 'weekly' ? 7 : 30),
            ).length;

    const totalVoicePublic =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter(
                    (channelId) =>
                        member.guild.channels.cache.has(channelId) &&
                        member.guild.channels.cache.get(channelId).parentId === guildData.publicCategory,
                )
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.voices.days,
                type,
                (channelId) =>
                    member.guild.channels.cache.has(channelId) &&
                    member.guild.channels.cache.get(channelId).parentId === guildData.publicCategory,
            );

    const totalMessageChat =
        type === 'all'
            ? Object.keys(messageChannels)
                .filter((channelId) => channelId === guildData.generalChat)
                .reduce((totalCount, channelId) => totalCount + messageChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.messages.days,
                type,
                (channelId) => channelId === guildData.generalChat,
            );

    const otherMessageChannels =
        type === 'all'
            ? Object.keys(messageChannels)
                .filter((channelId) => channelId !== guildData.generalChat)
                .reduce((totalCount, channelId) => totalCount + messageChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.messages.days,
                type,
                (channelId) => channelId === guildData.generalChat,
            );

    const otherVoiceChannels =
        type === 'all'
            ? Object.keys(voiceChannels)
                .filter(
                    (channelId) =>
                        !isStreamChannel(channelId) &&
                        !(guildData.camChannels || []).includes(channelId) &&
                        member.guild.channels.cache.has(channelId) &&
                        (member.guild.channels.cache.get(channelId).parentId !== guildData.publicCategory ||
                            member.guild.channels.cache.get(channelId).parentId !== guildData.registerCategory ||
                            member.guild.channels.cache.get(channelId).parentId !==
                            guildData.problemResolveCategory ||
                            member.guild.channels.cache.get(channelId).parentId !== guildData.staffTakeCategory),
                )
                .reduce((totalCount, channelId) => totalCount + voiceChannels[channelId], 0)
            : getChannelDaysTotal(
                document,
                document.voices.days,
                type,
                (channelId) =>
                    !isStreamChannel(channelId) &&
                    !(guildData.camChannels || []).includes(channelId) &&
                    member.guild.channels.cache.has(channelId) &&
                    (member.guild.channels.cache.get(channelId).parentId !== guildData.publicCategory ||
                        member.guild.channels.cache.get(channelId).parentId !== guildData.registerCategory ||
                        member.guild.channels.cache.get(channelId).parentId !== guildData.problemResolveCategory ||
                        member.guild.channels.cache.get(channelId).parentId !== guildData.staffTakeCategory),
            );

    return [
        {
            name: 'Toplam Bilgiler',
            value: [
                `Mesaj Toplam: ${totalMessages} mesaj`,
                `Ses Toplam: ${client.utils.numberToString(totalVoices)}`,
                `Davet Sayısı: ${invites.filter((d) =>
                    member.guild.members.cache.has(d.id) && type === 'all'
                        ? true
                        : (type === 'weekly'
                            ? 7
                            : 30 > now - member.guild.members.cache.get(d.id).joinedTimestamp) &&
                        now - member.guild.members.cache.get(d.id).user.createdTimestamp > 1000 * 60 * 60 * 7,
                ).length
                } davet`,
                `Taglı Üye Çekme: ${document.taggeds.filter((d) =>
                    member.guild.members.cache.has(d.user) && type === 'all'
                        ? true
                        : (type === 'weekly'
                            ? 7
                            : 30 > now - member.guild.members.cache.get(d.user).joinedTimestamp) &&
                        now - member.guild.members.cache.get(d.user).user.createdTimestamp > 1000 * 60 * 60 * 7,
                ).length
                } adet`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Yayın Bilgisi',
            value: [
                `Ses Süresi: ${client.utils.numberToString(totalVoiceStreams)}`,
                `Yayın Süresi: ${client.utils.numberToString(totalStreams)}`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Kamera Bilgisi',
            value: [
                `Ses Süresi: ${client.utils.numberToString(totalVoiceCameras)}`,
                `Kamera Süresi: ${client.utils.numberToString(totalCameras)}`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Yetkili Alım Bilgisi',
            value: [
                `Ses Süresi: ${client.utils.numberToString(totalVoiceStaffTake)}`,
                `Yetkili Sayısı: ${totalStaffTakes} adet`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Sorun Çözme Bilgisi',
            value: [
                `Ses Süresi: ${client.utils.numberToString(totalVoiceProblemResolve)}`,
                `SÇ Sayısı: ${totalProblemResolves} adet`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Kayıt Bilgisi',
            value: [
                `Ses Süresi: ${client.utils.numberToString(totalVoiceRegister)}`,
                `Kayıt Sayısı: ${totalRegister} adet`,
            ].join('\n'),
            inline: true,
        },
        {
            name: 'Public Bilgisi',
            value: `Ses Süresi: ${client.utils.numberToString(totalVoicePublic)}`,
            inline: true,
        },
        {
            name: 'Chat Bilgisi',
            value: `Mesaj Sayısı: ${totalMessageChat} mesaj`,
            inline: true,
        },
        {
            name: 'Diğer Kanallar',
            value: [
                `Ses Süresi: ${client.utils.numberToString(otherVoiceChannels)}`,
                `Mesaj Sayısı: ${otherMessageChannels} mesaj`,
            ].join('\n'),
            inline: true,
        },
    ];
}

function getChannelDaysTotal(document: UserStatClass, days: IDay, type: IType, filter: (channelId: string) => boolean) {
    return Object.keys(days || {})
        .filter((d) => (type === 'weekly' ? 7 : 30) > document.days - Number(d))
        .reduce((total, d) => {
            return (
                total +
                Object.keys(days[d])
                    .filter((channelId) => filter(channelId))
                    .reduce((channelTotal, channelId) => channelTotal + days[d][channelId], 0)
            );
        }, 0);
}
