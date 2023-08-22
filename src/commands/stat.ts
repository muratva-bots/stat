import { UserStatModel } from '@/models';
import { Canvas, loadFont, loadImage } from 'canvas-constructor/skia';
import { AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';

loadFont('Kanit', resolve(__dirname, '..', 'assets/Kanit-Regular.ttf'));

const specialColors = {
    1: '#90c2cc',
    2: '#ffd700',
    3: '#e07f1f',
};

const Command: Stat.ICommand = {
    usages: ['me', 'stat', 'stats'],
    execute: async ({ client, message, args }) => {
        const user = args.length
            ? (await client.utils.getUser(args[0])) ||
              (message.reference ? (await message.fetchReference()).author : undefined)
            : message.author;

        if (!user) {
            client.utils.sendTimedMessage(message, 'Geçerli bir kullanıcı belirt!');
            return;
        }

        if (user.bot) {
            client.utils.sendTimedMessage(message, 'Botların verisi bulunamaz!');
            return;
        }

        const document = await UserStatModel.findOne({ id: user.id, guild: message.guildId });
        if (!document) {
            client.utils.sendTimedMessage(message, 'Belirttiğin kullanıcının verisi bulunmuyor.');
            return;
        }

        const alignments = await UserStatModel.aggregate([
            { $match: { guild: message.guildId } },
            {
                $facet: {
                    voiceAlignments: [
                        { $sort: { 'voices.total': -1 } },
                        { $group: { _id: '_id', sortedVoices: { $push: '$_id' } } },
                        {
                            $project: {
                                alignment: { $indexOfArray: ['$sortedVoices', document._id] },
                                _id: 0,
                            },
                        },
                    ],
                    streamAlignments: [
                        { $sort: { 'streams.total': -1 } },
                        { $group: { _id: '_id', sortedStreams: { $push: '$_id' } } },
                        {
                            $project: {
                                alignment: { $indexOfArray: ['$sortedStreams', document._id] },
                                _id: 0,
                            },
                        },
                    ],
                    messageAlignments: [
                        { $sort: { 'messages.total': -1 } },
                        { $group: { _id: '_id', sortedMessages: { $push: '$_id' } } },
                        {
                            $project: {
                                alignment: { $indexOfArray: ['$sortedMessages', document._id] },
                                _id: 0,
                            },
                        },
                    ],
                    cameraAlignments: [
                        { $sort: { 'cameras.total': -1 } },
                        { $group: { _id: '_id', sortedCameras: { $push: '$_id' } } },
                        {
                            $project: {
                                alignment: { $indexOfArray: ['$sortedCameras', document._id] },
                                _id: 0,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    voiceAlignment: { $arrayElemAt: ['$voiceAlignments.alignment', -1] },
                    streamAlignment: { $arrayElemAt: ['$streamAlignments.alignment', -1] },
                    cameraAlignment: { $arrayElemAt: ['$cameraAlignments.alignment', -1] },
                    messageAlignment: { $arrayElemAt: ['$messageAlignments.alignment', -1] },
                },
            },
            {
                $project: {
                    voiceAlignment: 1,
                    streamAlignment: 1,
                    cameraAlignment: 1,
                    messageAlignment: 1,
                    _id: 0,
                },
            },
        ]);

        const backgroundBuffer = await loadImage('./src/assets/stat-card.png');
        const avatarBuffer = await loadImage(user.displayAvatarURL({ extension: 'png', size: 4096 }));
        const canvas = new Canvas(1152, 585);
        canvas.printImage(backgroundBuffer, 0, 0);

        canvas.setTextFont('normal 34px Kanit');

        canvas.printRoundedImage(avatarBuffer, 32, 15, 70, 70, 20);
        canvas.setColor('#ffffff');
        canvas.setTextSize(34);
        canvas.printText(user.displayName, 112, 64);

        canvas.setTextSize(20);
        canvas.setTextAlign('center');
        canvas.printText(`${document.days} günlük veri`, 960, 62);

        const voiceAlignment = alignments[0].voiceAlignment;
        canvas.setColor(specialColors[voiceAlignment + 1] || '#ffffff');
        canvas.printText(voiceAlignment !== -1 ? `${voiceAlignment + 1}. sırada` : 'Bulunmuyor.', 252, 183);

        const messageAlignment = alignments[0].messageAlignment;
        canvas.setColor(specialColors[messageAlignment + 1] || '#ffffff');
        canvas.printText(messageAlignment !== -1 ? `${messageAlignment + 1}. sırada` : 'Bulunmuyor.', 252, 233);

        const streamAlignment = alignments[0].streamAlignment;
        canvas.setColor(specialColors[streamAlignment + 1] || '#ffffff');
        canvas.printText(streamAlignment !== -1 ? `${streamAlignment + 1}. sırada` : 'Bulunmuyor.', 252, 283);

        const cameraAlignment = alignments[0].cameraAlignment;
        canvas.setColor(specialColors[cameraAlignment + 1] || '#ffffff');
        canvas.printText(cameraAlignment !== -1 ? `${cameraAlignment + 1}. sırada` : 'Bulunmuyor.', 252, 333);

        canvas.setColor('#ffffff');

        const messageDays = document.messages.days || {};
        const weeklyMessage = Object.keys(messageDays)
            .filter((d) => 14 >= document.days - Number(d))
            .reduce((totalCount, currentDay) => totalCount + messageDays[currentDay].total, 0);
        const monthlyMessage = Object.keys(messageDays)
            .filter((d) => 30 >= document.days - Number(d))
            .reduce((totalCount, currentDay) => totalCount + messageDays[currentDay].total, 0);

        canvas.printText(`${document.messages.total || 0} mesaj`, 630, 183);
        canvas.printText(`${(messageDays[document.days] || { total: 0 }).total} mesaj`, 630, 233);
        canvas.printText(`${weeklyMessage || 0} mesaj`, 630, 283);
        canvas.printText(`${monthlyMessage || 0} mesaj`, 630, 333);

        const voiceDays = document.voices.days || {};
        const weeklyVoice = Object.keys(voiceDays)
            .filter((d) => 14 >= document.days - Number(d))
            .reduce((totalCount, currentDay) => totalCount + voiceDays[currentDay].total, 0);
        const monthlyVoice = Object.keys(voiceDays)
            .filter((d) => 30 >= document.days - Number(d))
            .reduce((totalCount, currentDay) => totalCount + voiceDays[currentDay].total, 0);

        canvas.printText(client.utils.numberToString(document.voices.total), 1015, 183);
        canvas.printText(client.utils.numberToString((voiceDays[document.days] || { total: 0 }).total), 1015, 233);
        canvas.printText(client.utils.numberToString(weeklyVoice), 1015, 283);
        canvas.printText(client.utils.numberToString(monthlyVoice), 1015, 333);

        const messageChannels = document.messages.channels || {};
        const mostMessageChannel = Object.keys(messageChannels).sort(
            (a, b) => messageChannels[b] - messageChannels[a],
        )[0];

        const voiceChannels = document.voices.channels || {};
        const mostVoiceChannel = Object.keys(voiceChannels).sort((a, b) => voiceChannels[b] - voiceChannels[a])[0];

        canvas.printText(
            mostMessageChannel
                ? `#${message.guild.channels.cache.get(mostMessageChannel)?.name || 'Silinmiş kanal.'}`
                : 'Bulunmuyor.',
            180,
            462,
        );
        canvas.printText(
            mostVoiceChannel
                ? message.guild.channels.cache.get(mostVoiceChannel)?.name || 'Silinmiş kanal.'
                : 'Bulunmuyor.',
            180,
            512,
        );

        canvas.printText(mostMessageChannel ? `${messageChannels[mostMessageChannel]} mesaj` : 'Bulunmuyor.', 420, 462);
        canvas.printText(
            mostVoiceChannel ? client.utils.numberToString(voiceChannels[mostVoiceChannel]) : 'Bulunmuyor.',
            420,
            512,
        );

        const voiceFriends = Object.keys(document.voiceFriends || {});
        const chatFriends = Object.keys(document.chatFriends || {});
        const bestFriendChat = chatFriends.length
            ? chatFriends.reduce((a, b) => (chatFriends[a] > chatFriends[b] ? a : b))[0]
            : undefined;
        const bestFriendVoice = voiceFriends.length
            ? voiceFriends.reduce((a, b) => (voiceFriends[a] > voiceFriends[b] ? a : b))[0]
            : undefined;

        canvas.printText(
            bestFriendChat
                ? (await client.utils.getUser(bestFriendChat))?.displayName || 'Hesabını silmiş.'
                : 'Bulunmuyor.',
            1000,
            464,
        );
        canvas.printText(
            bestFriendVoice
                ? (await client.utils.getUser(bestFriendVoice))?.displayName || 'Hesabını silmiş.'
                : 'Bulunmuyor.',
            1000,
            512,
        );

        const attachment = new AttachmentBuilder(canvas.png(), { name: 'user-stats.png' });
        message.channel.send({ files: [attachment], components: [] });
    },
};

export default Command;
