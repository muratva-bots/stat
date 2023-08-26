import { GuildModel } from "@/models";
import { ActionRowBuilder, Events, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, VoiceChannel, bold, inlineCode, userMention } from "discord.js";

const inviteRegex = new RegExp(/discord(?:app.com\/invite|.gg|.me|.io)(?:[\\]+)?\/([a-zA-Z0-9\-]+)/, 'gi');

const InteractionCreate: Stat.IEvent<Events.InteractionCreate> = {
    name: Events.InteractionCreate,
    execute: async (client, interaction) => {
        if (!interaction.isButton() || !["limit", "kick", "rename", "add", "transfer"].includes(interaction.customId)) return;

        const guildData = client.servers.get(interaction.guildId);
        if (!guildData) return;

        const member = await client.utils.getMember(interaction.guild, interaction.user.id);
        if (!member) return;

        const minStaffRole = interaction.guild.roles.cache.get(guildData.minStaffRole);
        if (
            !member.permissions.has(PermissionFlagsBits.Administrator) &&
            !member.roles.cache.has(guildData.streamerRole) &&
            (minStaffRole && minStaffRole.position > member.roles.highest.position)
        ) return;

        if (!member.voice.channelId) {
            interaction.reply({
                content: "Seste yoksun.",
                ephemeral: true
            });
            return;
        }

        const channel = interaction.channel as VoiceChannel;

        const owneredChannel = (guildData.owneredStreams || []).find(ow => ow.channel === channel.id && ow.owner === interaction.user.id);
        if (!owneredChannel) {
            interaction.reply({
                content: "Odanın sahibi sen değilsin.",
                ephemeral: true
            });
            return;
        }

        const hasAnotherOwner = (guildData.owneredStreams || []).find(os => os.channel === channel.id);
        if (hasAnotherOwner) {
            interaction.reply({
                content: `${userMention(hasAnotherOwner.owner)} (${inlineCode(hasAnotherOwner.owner)}) adlı kullanıcı odanın sahibi.`,
                ephemeral: true
            });
            return;
        }

        if (channel.parentId !== guildData.streamCategory || (guildData.camChannels || []).includes(channel.id)) {
            interaction.reply({
                content: "Stream kanalında bulunman gerekiyor.",
                ephemeral: true
            })
            return;
        }

        if (interaction.customId === "kick") {
            const userId = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "user-id",
                        label: "Kullanıcı ID'si",
                        placeholder: "470974660264067072",
                        style: TextInputStyle.Short,
                        required: true
                    })
                ]
            });

            const modal = new ModalBuilder({ custom_id: "modal", title: "Kullanıcı Atma", components: [userId] });

            await interaction.showModal(modal);

            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            if (modalCollected) {
                const targetMember = await client.utils.getMember(interaction.guild, modalCollected.fields.getTextInputValue("user-id"));
                if (!targetMember) {
                    modalCollected.reply({
                        content: "Belirttiğin kullanıcı ID'si geçerli değil.",
                        ephemeral: true
                    });
                    return;
                }

                channel.permissionOverwrites.create(targetMember.id, { Connect: false, ViewChannel: false });

                modalCollected.reply({
                    content: `${targetMember} (${inlineCode(targetMember.id)}) adlı kullanıcı odadan atıldı.`,
                    ephemeral: true
                });
            }
            return;
        }

        if (interaction.customId === "transfer") {
            const userId = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "user-id",
                        label: "Kullanıcı ID'si",
                        placeholder: "470974660264067072",
                        style: TextInputStyle.Short,
                        required: true
                    })
                ]
            });

            const modal = new ModalBuilder({ custom_id: "modal", title: "Odayı Aktarma", components: [userId] });

            await interaction.showModal(modal);

            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            if (modalCollected) {
                const targetMember = await client.utils.getMember(interaction.guild, modalCollected.fields.getTextInputValue("user-id"));
                if (!targetMember) {
                    modalCollected.reply({
                        content: "Belirttiğin kullanıcı ID'si geçerli değil.",
                        ephemeral: true
                    });
                    return;
                }

                if (
                    !targetMember.permissions.has(PermissionFlagsBits.Administrator) ||
                    !targetMember.roles.cache.has(guildData.streamerRole) ||
                    (minStaffRole && minStaffRole.position > targetMember.roles.highest.position)
                ) {
                    interaction.reply({
                        content: "Belirttiğin kişi yetkili değil.",
                        ephemeral: true
                    });
                    return;
                }

                hasAnotherOwner.owner = targetMember.id;
                await GuildModel.updateOne({ id: interaction.guildId }, { $set: { "stat.owneredStreams": guildData.owneredStreams } }, { upsert: true });
                
                modalCollected.reply({
                    content: `${targetMember} (${inlineCode(targetMember.id)}) adlı yetkiliye oda aktarıldı.`,
                    ephemeral: true
                });
            }
            return;
        }

        if (interaction.customId === "add") {
            const userId = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "user-id",
                        label: "Kullanıcı ID'si",
                        placeholder: "470974660264067072",
                        style: TextInputStyle.Short,
                        required: true
                    })
                ]
            });

            const modal = new ModalBuilder({ custom_id: "modal", title: "Kullanıcı Ekleme", components: [userId] });

            await interaction.showModal(modal);

            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            if (modalCollected) {
                const targetMember = await client.utils.getMember(interaction.guild, modalCollected.fields.getTextInputValue("user-id"));
                if (!targetMember) {
                    modalCollected.reply({
                        content: "Belirttiğin kullanıcı ID'si geçerli değil.",
                        ephemeral: true
                    });
                    return;
                }

                channel.permissionOverwrites.cache
                    .filter((p) => hasAnotherOwner.permissions.includes(p.id))
                    .forEach((p) => p.edit({ Connect: false }));
                channel.permissionOverwrites.create(targetMember.id, { Connect: true, ViewChannel: true });

                modalCollected.reply({
                    content: `${targetMember} (${inlineCode(targetMember.id)}) adlı kullanıcı kanala eklendi ve oda herkese kapatıldı. (Önceden eklenen kullanıcılar hariç.)`,
                    ephemeral: true
                });
            }
            return;
        }

        if (interaction.customId === "rename") {
            const name = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "name",
                        label: "Oda Adı",
                        placeholder: "🗼 Stark Tower",
                        style: TextInputStyle.Short,
                        required: true
                    })
                ]
            });

            const modal = new ModalBuilder({ custom_id: "modal", title: "Oda İsimi Değiştirme", components: [name] });

            await interaction.showModal(modal);

            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            if (modalCollected) {
                const name = modalCollected.fields.getTextInputValue("name");
                if (!name.match(inviteRegex)) {
                    modalCollected.reply({
                        content: "Sunucu daveti girmek?",
                        ephemeral: true
                    });
                    return;
                }

                channel.setName(name);

                interaction.reply({
                    content: `Oda adı başarıyla ${bold(name)} şeklinde değiştirildi.`,
                    ephemeral: true
                });
            }
            return;
        }

        if (interaction.customId === "limit") {
            const limit = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "limit",
                        label: "Oda Limiti",
                        placeholder: "99",
                        style: TextInputStyle.Short,
                        required: true
                    })
                ]
            });

            const modal = new ModalBuilder({ custom_id: "modal", title: "Oda Limiti Değiştirme", components: [limit] });

            await interaction.showModal(modal);

            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            if (modalCollected) {
                const limit = Number(modalCollected.fields.getTextInputValue("limit"));
                if (!limit || 0 > limit) {
                    modalCollected.reply({
                        content: "Geçerli bir sayı gir.",
                        ephemeral: true
                    });
                    return;
                }

                channel.setUserLimit(limit > 99 ? 99 : limit);

                interaction.reply({
                    content: `Oda limiti başarıyla ${bold(limit.toString())} şeklinde değiştirildi.`,
                    ephemeral: true
                });
            }
            return;
        }
    },
}

export default InteractionCreate;
