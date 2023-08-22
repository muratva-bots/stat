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

async function weeklyMessageAndVoiceTop(client: Client, message: Message, question: Message, typeRow: ActionRowBuilder<StringSelectMenuBuilder>, type: string, guildData: StatClass) {
    const documents = await UserStatModel.aggregate([
        { $match: { guild: message.guild.id, [type === 'weekly-message' ? 'messages.days' : 'voices.days']: { $exists: true } } },
        {
            $project: {
                id: '$id',
                days: '$days',
                daysData: type === 'weekly-message' ? '$messages.days' : '$voices.days',
            },
        },
        {
            $addFields: {
                total: {
                    $reduce: {
                        input: {
                            $filter: {
                                input: { $objectToArray: '$daysData' },
                                as: 'day',
                                cond: { $gte: [guildData.days - 7, { $subtract: [guildData.days, { $toInt: '$$day.k' }] }] },
                            },
                        },
                        initialValue: 0,
                        in: {
                            $sum: "$$this.v.total"
                        }
                    }
                },
            },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $project: { id: '$id', total: '$total' } },
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
                        (d, index) =>
                            `${specials[index + 1] || `${index + 1}.`} ${userMention(d.id)} (${inlineCode(d.id)}): ${italic(
                                type === 'weekly-voice'
                                    ? client.utils.numberToString(d.total)
                                    : `${d.total} mesaj`,
                            )} ${d.id === message.author.id ? `(${bold("Siz")})` : ""}`,
                    )
                    .join('\n'),
            }),
        ],
        files: [],
        components: [typeRow],
    });
}

export default weeklyMessageAndVoiceTop;
