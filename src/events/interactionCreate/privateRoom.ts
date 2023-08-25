import { GuildModel, StatClass } from "@/models";
import { ActionRowBuilder, ButtonInteraction, ChannelType, Events, ModalBuilder, PermissionFlagsBits, PermissionsBitField, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, VoiceChannel, bold, channelMention, inlineCode, userMention } from "discord.js";
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
            new TextInputBuilder({
                custom_id: "private",
                label: "Oda herkese gizli mi olacak?",
                placeholder: "gizliyse evet, değilse hayır",
                max_length: 5,
                min_length: 3,
                style: TextInputStyle.Short,
                required: true
            })
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

    const overwrites = [
        {
            id: interaction.guild.roles.everyone,
            allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.Connect],
        },
    ];
    if (channelPrivate.toLocaleLowerCase() === "evet" || channelPrivate.toLocaleLowerCase() === "evt") {
        // overwrites.push({
        //     id: interaction.guild.roles.everyone,
        //     deny: [PermissionsBitField.Flags.Connect],
        // });
    } else {
        overwrites.push({
            id: interaction.guild.roles.everyone,
            allow: [PermissionsBitField.Flags.Connect],
        });
    }
    const voiceChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: guildData.secretCategory,
        userLimit: parseInt(channelLimit) || 2,
        permissionOverwrites: overwrites,
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
            channelName: voiceChannel.name,
            userPermissions: null
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

    await textChannel.send({
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
      
    }

export default privateRoom;
