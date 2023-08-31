import { GuildModel, StatClass } from "@/models";
import { ActionRowBuilder, ButtonInteraction, ChannelType, ComponentType, Events, Interaction, MentionableSelectMenuBuilder, ModalBuilder, PermissionFlagsBits, PermissionsBitField, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder, VoiceChannel, bold, channelMention, inlineCode, userMention } from "discord.js";
import { Client } from '@/structures';


async function privateRoom(client: Client, interaction: ButtonInteraction, guildData: StatClass) {
    const inviteRegex = new RegExp(/discord(?:app.com\/invite|.gg|.me|.io)(?:[\\]+)?\/([a-zA-Z0-9\-]+)/, 'gi');
    const hasOwneredChannel = (guildData.owneredPrivate || []).find(os => os.owner === interaction.user.id);
    if (hasOwneredChannel) {
            interaction.reply({ content: `${channelMention(hasOwneredChannel.voiceChannel)} (${inlineCode(hasOwneredChannel.voiceChannel)}) adlı odaya sahipsin.`, ephemeral: true})
        return;
    }

    const privateRoomInput = new ActionRowBuilder<TextInputBuilder>({
        components: [
            new TextInputBuilder({
                custom_id: "name",
                label: "Oda ismi belirt",
                placeholder: "canzade özel odası",
                min_length: 4,
                max_length: 15,
                style: TextInputStyle.Short,
                required: true
            }),
            new TextInputBuilder({
                custom_id: "limit",
                label: "Oda limiti belirt",
                placeholder: "2",
                max_length: 2,
                style: TextInputStyle.Short,
                required: true
            }),
        ]
    });
    const modal = new ModalBuilder({ custom_id: "modal", title: "Özel Oda", components: [privateRoomInput]});

    await interaction.showModal(modal);

    const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
    const channelLimit = modalCollected.fields.getTextInputValue("limit")
    const channelName = modalCollected.fields.getTextInputValue("name")
    const channelPrivate = modalCollected.fields.getTextInputValue("private")

    if (modalCollected) {
            const limit = Number(channelLimit);
            if (!limit || 0 > limit) {
                modalCollected.reply({
                    content: "Geçerli bir sayı gir.",
                    ephemeral: true
                });
                return;
            }
            const name = channelName
            if (!name.match(inviteRegex)) {
                modalCollected.reply({
                    content: "Sunucu daveti girmek?",
                    ephemeral: true
                });
                return;
        }
        const privateRoom = channelPrivate
            if (!privateRoom.match(inviteRegex)) {
                modalCollected.reply({
                    content: "Sunucu daveti girmek?",
                    ephemeral: true
                });
                return;
        }
    }


    const voiceChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: guildData.secretCategory,
        userLimit: parseInt(channelLimit) || 2,
        permissionOverwrites:  [
            {
                id: interaction.guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            },
        ],
    });
    const textChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: guildData.secretCategory,
        userLimit: parseInt(channelLimit) || 2,
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel],
            },
        ],
    });

    guildData.owneredPrivate = [
        ...(guildData.owneredPrivate || []),
        {
            owner: interaction.user.id,
            textChannel: textChannel.id,
            voiceChannel: voiceChannel.id,
            permissions: null
        }
    ];

    await GuildModel.updateOne(
        { id: interaction.guildId },
        { $set: { "stat.owneredPrivate": guildData.owneredPrivate } },
        { upsert: true }
    );

    await interaction.reply({
        content: `Özel odanız oluşturuldu! Ses kanalı: ${voiceChannel} Metin kanalı: ${textChannel}`,
        ephemeral: true,
    });

    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>({
        components: [
            new StringSelectMenuBuilder({
                custom_id: 'type',
                placeholder: 'Ayar seç!',
                options: [
                    { label: 'Kanal bilgileri', value: 'privateRoom-info' },
                    { label: 'Üye izin ver', value: 'user-allow' },
                    { label: 'Üye engelle', value: 'user-deny' },
                    { label: 'Üyeyi kanaldan at', value: 'user-kick' },
                    { label: 'Kanal ismi değiştir', value: 'privateRoom-changeName' },
                    { label: 'Kanal limiti değiştir', value: 'privateRoom-changeLimit' },
                ],
            }),
        ],
    });

    const question = await textChannel.send({
        content: `
${client.utils.getEmoji("zadestat")} Merhaba ${
            interaction.member
        }! Kanalını (${voiceChannel}) yönetmek için aşağıdaki menüyü kullanabilirsin!

${client.utils.getEmoji(
"secreticon",
)} Kanalın herkese açıksa, yasakladığın kullanıcılar odana giremez			
${client.utils.getEmoji(
"secreticon",
)} Kanalın herkese kilitliyse, izin verdiğin kişiler dışında kimse giremez! (Yönetici permi olanlar dışında tabii ki :)) 

${client.utils.getEmoji(
"secreticon2",
)} **5 dakika boyunca kanalda hiçbir kullanıcı bulunmazsa kanal otomatik olarak silinecektir.**
\`Lütfen kanala eklemek istediğin üye ID'lerini her defasında birer tane olacak şekilde yazınız. En fazla 6 kullanıcı ekleyebilirsiniz.\`
`,
        components: [typeRow],
    });


    const filter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = await question.createMessageComponentCollector({
        filter
    });

    collector.on('collect', async (i: Interaction) => {
        if (i.isStringSelectMenu()) {

        if(i.values[0] === "privateRoom-info") {

            interaction.reply({ content: [
                `Kanal Adı: ${voiceChannel.name}`,
                `Kanal Limiti: ${voiceChannel.userLimit || "Yok"}`,
                `Kanal Gizliliği: ${
					voiceChannel
						.permissionsFor(interaction.guild.id)
						.has(PermissionsBitField.Flags.Connect)
						? "Açık"
						: "Gizli"
				}`
            ].join("\n"), ephemeral: true })

        } if(i.values[0] === "user-allow") {
            //maksimum 20 kullanıcı ekleyebilirsin cart curt
            //kullanıcının zaten kanal izni var

            const userAndRoleRow = new ActionRowBuilder<MentionableSelectMenuBuilder>({
                components: [
                    new MentionableSelectMenuBuilder({
                        custom_id: 'auth',
                        maxValues: 20,
                        placeholder: 'Kullanıcı veya rol ara...',
                    }),
                ],
            });
          const question = await interaction.reply({ components: [userAndRoleRow], ephemeral: true })

          const authCollected = await question.awaitMessageComponent({
            time: 1000 * 60 * 10,
            componentType: ComponentType.MentionableSelect,
        });

            if(authCollected) {
                voiceChannel.permissionOverwrites.edit(`${authCollected.values}`, {
                    Connect: true,
                    ViewChannel: true
                });
                interaction.reply({ content: `${authCollected.values} kullanıcı(ları) başarıyla odaya eklendi.`, ephemeral: true })
            }
        } if(i.values[0] === "user-deny") {

            //maksimum 20 kullanıcı ekleyebilirsin cart curt
            //kullanıcının zaten kanal izni yok


            const userAndRoleRow = new ActionRowBuilder<MentionableSelectMenuBuilder>({
                components: [
                    new MentionableSelectMenuBuilder({
                        custom_id: 'auth',
                        maxValues: 20,
                        placeholder: 'Kullanıcı veya rol ara...',
                    }),
                ],
            });
          const question = await interaction.reply({ components: [userAndRoleRow], ephemeral: true })

          const authCollected = await question.awaitMessageComponent({
            time: 1000 * 60 * 10,
            componentType: ComponentType.MentionableSelect,
        });

            if(authCollected) {
                voiceChannel.permissionOverwrites.edit(`${authCollected.values}`, {
                    Connect: false,
                    ViewChannel: false
                });
                interaction.reply({ content: `${authCollected.values} kullanıcı(ları) başarıyla odadan yasaklandı.`, ephemeral: true })

            }
        } if(i.values[0] === "user-kick") {

            const userAndRoleRow = new ActionRowBuilder<UserSelectMenuBuilder>({
                components: [
                    new UserSelectMenuBuilder({
                        custom_id: 'auth',
                        maxValues: 20,
                        placeholder: 'Kullanıcı ara...',
                    }),
                ],
            });
          const question = await interaction.reply({ components: [userAndRoleRow], ephemeral: true })

          const authCollected = await question.awaitMessageComponent({
            time: 1000 * 60 * 10,
            componentType: ComponentType.UserSelect,
        });

            if(authCollected) {
                //yapılacak
             
                interaction.reply({ content: `${authCollected.values} kullanıcı(ları) bağlantısı kesildi.`, ephemeral: true })

            }
        } if(i.values[0] === "privateRoom-changeName") {

            const privateRoomInput = new ActionRowBuilder<TextInputBuilder>({
                components: [
                    new TextInputBuilder({
                        custom_id: "name-edit",
                        label: "Oda ismini düzenle",
                        placeholder: "canzade özel odası",
                        min_length: 4,
                        max_length: 15,
                        style: TextInputStyle.Short,
                        required: true
                    }),
                ]
            });
            const modal = new ModalBuilder({ custom_id: "modal", title: "Özel Odanı Düzenle", components: [privateRoomInput]});
        
            await interaction.showModal(modal);
        
            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            const channelNameEdit = modalCollected.fields.getTextInputValue("name-edit")

          const authCollected = await question.awaitMessageComponent({
            time: 1000 * 60 * 10,
            componentType: ComponentType.UserSelect,
        });

            if(authCollected) {
                const name = channelNameEdit
                if (!name.match(inviteRegex)) {
                    modalCollected.reply({
                        content: "Sunucu daveti girmek?",
                        ephemeral: true
                    });
                    return;
            }

             voiceChannel.edit({ name: name })

             
                interaction.reply({ content: `Oda ismi başarıyla ${bold(name)} olarak ayarlandı.`, ephemeral: true })

            }
        }  if(i.values[0] === "privateRoom-changeLimit") {

            const privateRoomInput = new ActionRowBuilder<TextInputBuilder>({
                components: [
                 
                    new TextInputBuilder({
                        custom_id: "limit",
                        label: "Oda limiti belirt",
                        placeholder: "2",
                        max_length: 2,
                        style: TextInputStyle.Short,
                        required: true
                    }),
                ]
            });
            const modal = new ModalBuilder({ custom_id: "modal", title: "Özel Odanı Düzenle", components: [privateRoomInput]});
        
            await interaction.showModal(modal);
        
            const modalCollected = await interaction.awaitModalSubmit({ time: 1000 * 60 * 2 });
            const channelLimitEdit = modalCollected.fields.getTextInputValue("limit")

          const authCollected = await question.awaitMessageComponent({
            time: 1000 * 60 * 10,
            componentType: ComponentType.UserSelect,
        });

            if(authCollected) {
                const limit = Number(channelLimit);
                if (!limit || 0 > limit) {
                    modalCollected.reply({
                        content: "Geçerli bir sayı gir.",
                        ephemeral: true
                    });
                    return;
                }

             voiceChannel.edit({ userLimit: limit })
             
                interaction.reply({ content: `Oda limiti başarıyla ${bold(`${limit}`)} olarak ayarlandı.`, ephemeral: true })

            }
        }


        }
    })


      
    }

export default privateRoom;
