import { GuildModel, StatClass } from '@/models';
import { Client } from '@/structures';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    Interaction,
    Message,
    StringSelectMenuBuilder,
    bold,
    channelMention,
    inlineCode,
} from 'discord.js';
import mainHandler from './mainHandler';

export interface IChannelOption {
    name: string;
    value: string;
    description: string;
    type: string;
    isParent: boolean;
    isVoice: boolean;
    isMultiple: boolean;
}

export async function channelHandler(
    client: Client,
    message: Message,
    option: IChannelOption,
    guildData: StatClass,
    question: Message,
) {
    const rowTwo = new ActionRowBuilder<ChannelSelectMenuBuilder>({
        components: [
            new ChannelSelectMenuBuilder({
                custom_id: 'channel',
                placeholder: 'Kanal ara..',
                max_values: option.isMultiple ? 25 : 1,
                channel_types: option.isVoice
                    ? [ChannelType.GuildVoice]
                    : option.isParent
                    ? [ChannelType.GuildCategory]
                    : [ChannelType.GuildText],
            }),
        ],
    });

    const rowThree = new ActionRowBuilder<ButtonBuilder>({
        components: [
            new ButtonBuilder({
                custom_id: 'back',
                label: 'Geri',
                style: ButtonStyle.Danger,
            }),
        ],
    });

    await question.edit({
        content: '',
        components: [createComponent(message, option, guildData), rowTwo, rowThree],
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

        if (i.isChannelSelectMenu()) {
            if (option.isMultiple) guildData[option.value] = i.values;
            else guildData[option.value] = i.values[0];

            await GuildModel.updateOne(
                { id: message.guildId },
                { $set: { [`stat.${option.value}`]: guildData[option.value] } },
                { upsert: true, setDefaultsOnInsert: true },
            );

            i.reply({
                content: `Başarıyla ${bold(option.name)} adlı ayar ${i.values.map(v => `${channelMention(v)} (${inlineCode(v)})`).join(", ")} şeklinde ayarlandı.`,
                ephemeral: true,
            });

            question.edit({
                components: [createComponent(message, option, guildData), rowTwo, rowThree],
            });
        }

        if (i.isStringSelectMenu()) {
            if (option.isMultiple) {
                const newData = guildData[option.value] || ([] as string[]);
                guildData[option.value] = newData.filter((r) => !i.values.includes(r));
            } else guildData[option.value] = undefined;

            const updateQuery = option.isMultiple
                ? { [`stat.${option.value}`]: guildData[option.value] }
                : { $unset: { [`stat.${option.value}`]: 1 } };
            await GuildModel.updateOne({ id: message.guildId }, updateQuery);

            i.reply({
                content: `Başarıyla ${bold(option.name)} adlı ayardan ${i.values.map(v => `${channelMention(v)} (${inlineCode(v)})`).join(", ")} kaldırdı.`,
                ephemeral: true,
            });

            question.edit({
                components: [createComponent(message, option, guildData), rowTwo, rowThree],
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

function createComponent(message: Message, option: IChannelOption, guildData: StatClass) {
    const channels = [...(option.isMultiple ? guildData[option.value] || [] : [guildData[option.value]])].filter((r) =>
        message.guild.channels.cache.has(r),
    ) as string[];
    return new ActionRowBuilder<StringSelectMenuBuilder>({
        components: [
            new StringSelectMenuBuilder({
                custom_id: 'data',
                placeholder: option.name,
                disabled: !channels.length,
                max_values: channels.length === 0 ? 1 : channels.length,
                options: channels.length
                    ? channels.map((r) => ({
                          label: message.guild.channels.cache.get(r).name,
                          value: r,
                          description: 'Kaldırmak için tıkla!',
                          emoji: {
                            id: option.isVoice ? '1135211149885976686' : '1135211232597651516',
                        },
                      }))
                    : [
                          {
                              label: 'no setting',
                              value: 'no-setting',
                          },
                      ],
            }),
        ],
    });
}