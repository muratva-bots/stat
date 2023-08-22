import { GuildModel } from '@/models';
import { Client } from '@/structures';
import { EmbedBuilder, Guild, TextChannel, codeBlock } from 'discord.js';
import { schedule } from 'node-cron';

export function dailyStat({ client, guild }: { client: Client; guild: Guild }) {
    schedule('0 0 0 * * 7', async () => {
        const channel = guild.channels.cache.find((c) => c.name === 'developers') as TextChannel;
        if (!channel) return;

        const guildData = client.servers.get(guild.id);
        if (!guildData) return;

        channel.send({
            embeds: [
                new EmbedBuilder({
                    color: client.utils.getRandomColor(),
                    fields: [
                        {
                            name: `Toplam Giriş ${guildData.dailyJoin > guildData.lastJoin ? '📤' : '📥'}`,
                            value: codeBlock('fix', `${guildData.dailyJoin} kişi (${guildData.lastJoin} kişi)`),
                            inline: true,
                        },
                        {
                            name: `Toplam Çıkış ${guildData.dailyLeave > guildData.lastLeave ? '📤' : '📥'}`,
                            value: codeBlock('fix', `${guildData.dailyLeave} kişi (${guildData.lastLeave} kişi)`),
                            inline: true,
                        },
                        {
                            name: '\u200b',
                            value: codeBlock('fix', '-'.repeat(50)),
                            inline: false,
                        },
                        {
                            name: `Public ${guildData.dailyPublic > guildData.lastPublic ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyPublic)} (${client.utils.numberToString(
                                    guildData.lastPublic,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: `Stream ${guildData.dailyStream > guildData.lastStream ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyStream)} (${client.utils.numberToString(
                                    guildData.lastStream,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: `Secret/AFK ${guildData.dailyAfk > guildData.lastAfk ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyAfk)} (${client.utils.numberToString(
                                    guildData.lastAfk,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: '\u200b',
                            value: codeBlock('fix', '-'.repeat(50)),
                            inline: false,
                        },
                        {
                            name: `Toplam Ses ${guildData.dailyVoice > guildData.lastVoice ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyVoice)} (${client.utils.numberToString(
                                    guildData.lastVoice,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: `Yayın Açık ${guildData.dailyStreamOpen > guildData.lastStreamOpen ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyStreamOpen)} (${client.utils.numberToString(
                                    guildData.lastStreamOpen,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: `Kamera Açık ${guildData.dailyCamOpen > guildData.lastCamOpen ? '📤' : '📥'}`,
                            value: codeBlock(
                                'fix',
                                `${client.utils.numberToString(guildData.dailyCamOpen)} (${client.utils.numberToString(
                                    guildData.lastCamOpen,
                                )})`,
                            ),
                            inline: true,
                        },
                        {
                            name: '\u200b',
                            value: codeBlock('fix', '-'.repeat(50)),
                            inline: false,
                        },
                        {
                            name: `Toplam Mesaj ${guildData.dailyMessage > guildData.lastMessage ? '📤' : '📥'}`,
                            value: codeBlock('fix', `${guildData.dailyMessage} mesaj (${guildData.lastMessage} mesaj)`),
                            inline: true,
                        },
                        {
                            name: `Genel Sohbet ${guildData.dailyGeneral > guildData.lastMessage ? '📤' : '📥'}`,
                            value: codeBlock('fix', `${guildData.dailyGeneral} mesaj (${guildData.lastMessage} mesaj)`),
                            inline: true,
                        },
                    ],
                }),
            ],
        });

        guildData.lastJoin = guildData.dailyJoin;
        guildData.dailyJoin = 0;
        guildData.lastLeave = guildData.dailyLeave;
        guildData.dailyLeave = 0;
        guildData.lastPublic = guildData.dailyPublic;
        guildData.dailyPublic = 0;
        guildData.lastStream = guildData.dailyStream;
        guildData.dailyStream = 0;
        guildData.lastStreamOpen = guildData.dailyStreamOpen;
        guildData.dailyStreamOpen = 0;
        guildData.lastCamOpen = guildData.dailyCamOpen;
        guildData.dailyCamOpen = 0;
        guildData.lastMessage = guildData.dailyMessage;
        guildData.dailyMessage = 0;
        guildData.lastGeneral = guildData.dailyGeneral;
        guildData.dailyGeneral = 0;

        await GuildModel.updateOne({ id: guild.id }, { $set: { stat: guildData } }, { upsert: true });
    });
}
