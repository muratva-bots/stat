import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import weeklyMessageAndVoice from './weeklyMessageAndVoiceTop';
import allTimeTop from './allTimeTop';
import otherTop from './otherTop';

const titlesAndKeys = {
    'all-time': 'Tüm Zamanlar Genel Sıralama',
    'weekly-voice': 'Haftalık Ses Sıralama',
    'weekly-message': 'Haftalık Mesaj Sıralama',
    'weekly-camera': 'Haftalık Kamera Sıralama',
    'weekly-stream': 'Haftalık Yayın Sıralama',
    'weekly-public': 'Haftalık Public Sıralama',
    'weekly-register': 'Haftalık Teyit Ses Sıralama',
    'weekly-invite': 'Haftalık Davet Sıralama',
};

const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>({
    components: [
        new StringSelectMenuBuilder({
            custom_id: 'type',
            placeholder: 'Sıralama kategorisini seç!',
            options: Object.keys(titlesAndKeys).map((k) => ({ label: titlesAndKeys[k], value: k })),
        }),
    ],
});

const Command: Stat.ICommand = {
    usages: ['top'],
    execute: async ({ client, message, guildData }) => {
        typeRow.components[0].options.forEach((option) => option.setDefault(false));
        const question = await message.channel.send({ components: [typeRow] });

        const filter = (i: StringSelectMenuInteraction) => i.user.id === message.author.id;
        const collector = await question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 5,
            componentType: ComponentType.StringSelect,
        });

        collector.on('collect', async (i: StringSelectMenuInteraction) => {
            i.deferUpdate();
            if (i.values[0] === 'all-time') allTimeTop(client, question, typeRow);
            else if (!['weekly-voice', 'weekly-message'].includes(i.values[0])) otherTop(client, message, question, guildData, typeRow, i.values[0]);
            else weeklyMessageAndVoice(client, message, question, typeRow, i.values[0], guildData);
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const timesUp = new ActionRowBuilder<ButtonBuilder>({
                    components: [
                        new ButtonBuilder({
                            custom_id: 'times-up',
                            disabled: true,
                            emoji: { name: '⏱️' },
                            label: 'Mesajın Geçerlilik Süresi Doldu.',
                            style: ButtonStyle.Danger,
                        }),
                    ],
                });

                question.edit({ components: [timesUp] });
            }
        });
    },
};

export default Command;


