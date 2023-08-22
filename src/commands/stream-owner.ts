import { GuildModel } from "@/models";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, channelMention, escapeMarkdown, inlineCode, userMention } from "discord.js";

const Command: Stat.ICommand = {
    usages: ["stsahiplen", "stsahip", "sts"],
    checkPermission: ({ message, guildData }) => {
        const minStaffRole = message.guild.roles.cache.get(guildData.minStaffRole);
        return (
            message.member.permissions.has(PermissionFlagsBits.Administrator) || 
            message.member.roles.cache.has(guildData.streamerRole) || 
            (minStaffRole && message.member.roles.highest.position >= minStaffRole.position)
        );
    },
    execute: async ({ client, message, guildData }) => {
        const hasOwneredChannel = (guildData.owneredStreams || []).find(os => os.owner === message.author.id);
        if (hasOwneredChannel) {
            client.utils.sendTimedMessage(
                message,
                `${channelMention(hasOwneredChannel.channel)} (${inlineCode(hasOwneredChannel.channel)}) adlı odaya sahipsin.`
            );
            return;
        }

        if (!message.member.voice.channelId) {
            client.utils.sendTimedMessage(
                message,
                "Geçerli bir ses kanalına giriş yap."
            )
            return;
        }

        const channel = message.member.voice.channel;

        const hasAnotherOwner = (guildData.owneredStreams || []).find(os => os.channel === channel.id);
        if (hasAnotherOwner) {
            client.utils.sendTimedMessage(
                message,
                `${userMention(hasAnotherOwner.owner)} (${inlineCode(hasAnotherOwner.owner)}) adlı kullanıcı odanın sahibi.`
            );
            return;
        }

        if (channel.parentId !== guildData.streamCategory || (guildData.camChannels || []).includes(channel.id)) {
            client.utils.sendTimedMessage(
                message,
                "Stream kanalında bulunman gerekiyor."
            )
            return;
        }

        const buttonRow = new ActionRowBuilder<ButtonBuilder>({
            components: [
                new ButtonBuilder({
                    custom_id: "limit",
                    label: "Limit",
                    style: ButtonStyle.Secondary
                }),
                new ButtonBuilder({
                    custom_id: "kick",
                    label: "At",
                    style: ButtonStyle.Secondary
                }),
                new ButtonBuilder({
                    custom_id: "add",
                    label: "Ekle",
                    style: ButtonStyle.Secondary
                }),
                new ButtonBuilder({
                    custom_id: "rename",
                    label: "Oda İsmi Değiştir",
                    style: ButtonStyle.Secondary
                }),
                new ButtonBuilder({
                    custom_id: "transfer",
                    label: "Aktar",
                    style: ButtonStyle.Primary
                }),
            ]
        });

        guildData.owneredStreams = [
            ...(guildData.owneredStreams || []),
            {
                channel: channel.id,
                channelName: channel.name,
                owner: message.author.id,
                permissions: channel.permissionOverwrites.cache.map(p => p.id)
            }
        ];

        await GuildModel.updateOne(
            { id: message.guildId },
            { $set: { "stat.owneredStreams": guildData.owneredStreams } },
            { upsert: true }
        );

        message.member.voice.channel.send({
            content: `${message.member}, aşağıdaki menüden oda ayarlarını değişebilirsiniz.`,
            components: [buttonRow]
        });
    }
}

export default Command;
