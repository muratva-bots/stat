import { StatClass, UserStatModel } from "@/models";
import { Client } from "@/structures";
import { ActionRowBuilder, EmbedBuilder, Message, StringSelectMenuBuilder, bold, inlineCode, italic, userMention } from "discord.js";

const titlesAndKeys = {
    'all-time': 'Tüm Zamanlar Genel Sıralama',
    'weekly-voice': 'Haftalık Ses Sıralama',
    'weekly-message': 'Haftalık Mesaj Sıralama',
    'weekly-camera': 'Haftalık Kamera Sıralama',
    'weekly-stream': 'Haftalık Yayın Sıralama',
    'weekly-public': 'Haftalık Public Sıralama',
    'weekly-register': 'Haftalık Teyit Ses Sıralama',
};

const specials = {
    1: "🏆",
    2: "🥈",
    3: "🥉"
};

async function otherTop(client: Client, message: Message, question: Message, guildData: StatClass, typeRow: ActionRowBuilder<StringSelectMenuBuilder>, type: string) {
    const dataOptions = {
        'weekly-camera': {
            channels: (guildData.camChannels || []),
            daysData: 'cameras.days',
        },
        'weekly-stream': {
            channels: message.guild.channels.cache
                .filter(
                    (c) => c.isVoiceBased() && c.parentId === guildData.streamCategory && !(guildData.camChannels || []).includes(c.id),
                )
                .map((c) => c.id),
            daysData: 'streams.days',
        },
        'weekly-public': {
            channels: message.guild.channels.cache
                .filter((c) => c.isVoiceBased() && c.parentId === guildData.publicCategory && c.id !== guildData.afkRoom)
                .map((c) => c.id),
            daysData: 'voices.days',
        },
        'weekly-register': {
            channels: message.guild.channels.cache
                .filter((c) => c.isVoiceBased() && c.parentId === guildData.registerCategory)
                .map((c) => c.id),
            daysData: 'voices.days',
        },
    };

    const documents = await UserStatModel.aggregate([
        { $match: { guild: message.guild.id, [dataOptions[type].daysData]: { $exists: true } } },
        {
            $project: {
                id: '$id',
                total: {
                    $reduce: {
                        input: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: { $objectToArray: `$${dataOptions[type].daysData}` },
                                        as: 'day',
                                        cond: { $gte: [guildData.days - 7, { $subtract: [guildData.days, { $toInt: '$$day.k' }] }] },
                                    }
                                },
                                as: 'dayItem',
                                in: {
                                    $reduce: {
                                        input: {
                                            $filter: {
                                                input: { $objectToArray: '$$dayItem.v' },
                                                as: 'channel',
                                                cond: { $in: ['$$channel.k', dataOptions[type].channels] },
                                            }
                                        },
                                        in: { $add: ["$$value", "$$this.v"] },
                                        initialValue: 0,
                                    }
                                }
                            },
                        },
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this"] },
                    }
                }
            },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $project: { id: 1, total: 1 } },
    ]);

    typeRow.components[0].options.forEach((option) => option.setDefault(false));
    const optionIndex = typeRow.components[0].options.findIndex(
        (option) => option.data.value === type,
    );
    typeRow.components[0].options[optionIndex].setDefault(true);

    question.edit({
        embeds: [
            new EmbedBuilder({
                color: client.utils.getRandomColor(),
                title: titlesAndKeys[type],
                description: documents
                    .map(
                        (d, i) =>
                            `${specials[i + 1] || `${i + 1}.`} ${userMention(d.id)} (${inlineCode(d.id)}): ${italic(
                                client.utils.numberToString(d.total),
                            )} ${d.id === message.author.id ? `(${bold("Siz")})` : ""}`,
                    )
                    .join('\n'),
            }),
        ],
        files: [],
        components: [typeRow],
    });
}

export default otherTop;
