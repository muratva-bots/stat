import { GuildModel, IRank, StatClass } from '@/models';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Interaction,
    Message,
    ModalBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    inlineCode,
    roleMention,
} from 'discord.js';
import mainHandler from './mainHandler';
import { Client } from '@/structures';
import { RankFlags } from '@/enums';

const types = {
    camera: RankFlags.Camera,
    message: RankFlags.Message,
    stream: RankFlags.Stream,
    voice: RankFlags.Voice,
    invite: RankFlags.Invite,
};


export async function ranksHandler(client: Client, message: Message, guildData: StatClass, question: Message) {
    await question.edit({
        content: '',
        components: createRow(message, guildData.ranks),
    });

    const filter = (i: Interaction) => i.user.id === message.author.id;
    const collector = await question.createMessageComponentCollector({
        filter,
        time: 1000 * 60 * 10,
    });

    collector.on('collect', async (i: Interaction) => {
        if (i.isButton() && i.customId === 'back') {
            collector.stop('FINISH');
            i.deferUpdate();
            mainHandler(client, message, guildData, question);
            return;
        }

        if (i.isButton() && i.customId === 'add') {
            const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>({
                components: [
                    new RoleSelectMenuBuilder({
                        custom_id: 'role',
                        placeholder: 'Rol ara..',
                    }),
                ],
            });

            i.reply({
                content: 'Yetkili rolünü seçin. Herkese verilecek bir görev ise geç butonuna bas.',
                components: [roleRow],
                ephemeral: true,
            });

            const interactionMessage = await i.fetchReply();
            const roleCollected = await interactionMessage.awaitMessageComponent({
                time: 1000 * 60 * 10,
                componentType: ComponentType.RoleSelect
            });
            if (roleCollected) {
                roleCollected.deferUpdate();

                const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>({
                    components: [
                        new StringSelectMenuBuilder({
                            custom_id: 'type',
                            placeholder: 'Türü seçin.',
                            options: [
                                { label: 'Kamera', value: 'camera' },
                                { label: 'Mesaj', value: 'message' },
                                { label: 'Yayın', value: 'stream' },
                                { label: 'Ses', value: 'voice' },
                                { label: 'Davet', value: 'invite' },
                            ],
                        }),
                    ],
                });

                i.editReply({
                    content: 'Türü seçin.',
                    components: [typeRow],
                });

                const typeCollected = await interactionMessage.awaitMessageComponent({
                    time: 1000 * 60 * 10,
                    componentType: ComponentType.StringSelect,
                });
                if (typeCollected) {
                    const countRow = new ActionRowBuilder<TextInputBuilder>({
                        components: [
                            new TextInputBuilder({
                                custom_id: 'count',
                                placeholder: '10',
                                label: 'Sayı:',
                                style: TextInputStyle.Short,
                                required: true,
                            }),
                        ],
                    });
                
                
                    const modal = new ModalBuilder({
                        custom_id: 'modal',
                        title: 'Rol Ekleme',
                        components: [countRow],
                    });
                
                    await typeCollected.showModal(modal);
                
                    const modalCollected = await typeCollected.awaitModalSubmit({
                        time: 1000 * 60 * 3,
                    });
                    if (modalCollected) {
                        modalCollected.deferUpdate();
                
                        const count = Number(modalCollected.fields.getTextInputValue('count'));
                        if (!count) {
                            i.editReply({
                                content: 'Sayı sayı olmak zorundadır.',
                                components: [],
                            });
                            return;
                        }
                
                        guildData.ranks = [
                            ...(guildData.ranks || []),
                            {
                                count: count,
                                role: roleCollected.values[0],
                                type: types[typeCollected.values[0]]
                            },
                        ];
                
                        await GuildModel.updateOne(
                            { id: question.guildId },
                            { $set: { 'stat.ranks': guildData.ranks } },
                            { upsert: true, setDefaultsOnInsert: true },
                        );
                
                        question.edit({
                            components: createRow(question, guildData.ranks),
                        });
                
                        i.editReply({
                            content: `${
                                roleCollected.isButton()
                                    ? 'Herkese göre rol'
                                    : `${roleMention(roleCollected.values[0])} (${inlineCode(roleCollected.values[0])}) rolü`
                            } ayarlandı.`,
                            components: [],
                        });
                    }
                } else i.deleteReply();
            } else i.deleteReply();
        }

        if (i.isStringSelectMenu()) {
            const newData = (guildData.ranks || []) as IRank[];
            guildData.ranks = newData.filter((d) => !i.values.includes(d.role));

            await GuildModel.updateOne(
                { id: message.guildId },
                { $set: { 'stat.ranks': guildData.ranks } },
            );

            i.reply({
                content: `Başarıyla ${i.values
                    .map((r) => `${roleMention(r)} (${inlineCode(r)})`)
                    .join(', ')} adlı ayardan kaldırıldı.`,
                ephemeral: true,
            });

            question.edit({
                components: createRow(message, guildData.ranks),
            });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            const timeFinished = new ActionRowBuilder<ButtonBuilder>({
                components: [
                    new ButtonBuilder({
                        custom_id: 'timefinished',
                        disabled: true,
                        emoji: { name: '⏱️' },
                        style: ButtonStyle.Danger,
                    }),
                ],
            });

            question.edit({ components: [timeFinished] });
        }
    });
}

function createRow(message: Message, ranks: IRank[]) {
    const datas = (ranks || []).filter((r) => message.guild.roles.cache.has(r.role));
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>({
            components: [
                new StringSelectMenuBuilder({
                    custom_id: 'data',
                    disabled: !datas.length,
                    placeholder: 'Roller',
                    max_values: datas.length === 0 ? 1 : datas.length,
                    options: datas.length
                        ? datas.map((r) => ({
                              label: message.guild.roles.cache.get(r.role).name,
                              value: r.role,
                              description: `${r.count}`,
                          }))
                        : [{ label: 'test', value: 'a' }],
                }),
            ],
        }),
        new ActionRowBuilder<ButtonBuilder>({
            components: [
                new ButtonBuilder({
                    custom_id: 'back',
                    label: 'Geri',
                    style: ButtonStyle.Danger,
                }),
                new ButtonBuilder({
                    custom_id: 'add',
                    label: 'Ekle',
                    style: ButtonStyle.Success,
                }),
            ],
        }),
    ];
}
