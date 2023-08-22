import { UserStatModel } from "@/models";
import { Client } from "@/structures";
import { Canvas, loadFont, loadImage } from "canvas-constructor/skia";
import { ActionRowBuilder, AttachmentBuilder, Message, StringSelectMenuBuilder } from "discord.js";
import { resolve } from "path";

loadFont('Kanit', resolve(__dirname, '..', '..', 'assets/Kanit-Regular.ttf'));

async function allTimeTop(client: Client, question: Message, typeRow: ActionRowBuilder<StringSelectMenuBuilder>) {
    const topData = await UserStatModel.aggregate([
        {
            $facet: {
                topVoices: [
                    { $sort: { 'voices.total': -1 } },
                    { $limit: 3 },
                    { $project: { _id: 0, id: 1, voices: 1 } },
                ],
                topStreams: [
                    { $sort: { 'streams.total': -1 } },
                    { $limit: 3 },
                    { $project: { _id: 0, id: 1, streams: 1 } },
                ],
                topMessages: [
                    { $sort: { 'messages.total': -1 } },
                    { $limit: 3 },
                    { $project: { _id: 0, id: 1, messages: 1 } },
                ],
                topCameras: [
                    { $sort: { 'cameras.total': -1 } },
                    { $limit: 3 },
                    { $project: { _id: 0, id: 1, cameras: 1 } },
                ],
            },
        },
        {
            $project: {
                topVoices: 1,
                topStreams: 1,
                topMessages: 1,
                topCameras: 1,
            },
        },
    ]);
    const backgroundBuffer = await loadImage('./src/assets/top.png');
    const canvas = new Canvas(1152, 589);
    canvas.printImage(backgroundBuffer, 0, 0);

    canvas.setTextFont('normal 24px Kanit');
    canvas.setColor('#ffffff');

    const firstColumns = [128, 187, 247];
    const secondColumns = [394, 454, 515];

    for (let i = 0; i < 3; i++) {
        const displayName = (await client.utils.getUser(topData[0].topVoices[i]?.id))?.displayName;
        const text = displayName || 'Silinmiş hesap.';
        canvas.printResponsiveText(text, 130, firstColumns[i], 270);
    }

    for (let i = 0; i < 3; i++) {
        const displayName = (await client.utils.getUser(topData[0].topMessages[i]?.id))?.displayName;
        const text = displayName || 'Silinmiş hesap.';
        canvas.printResponsiveText(text, 692, firstColumns[i], 270);
    }

    for (let i = 0; i < 3; i++) {
        const displayName = (await client.utils.getUser(topData[0].topCameras[i]?.id))?.displayName;
        const text = displayName || 'Silinmiş hesap.';
        canvas.printResponsiveText(text, 130, secondColumns[i], 270);
    }

    for (let i = 0; i < 3; i++) {
        const displayName = (await client.utils.getUser(topData[0].topStreams[i]?.id))?.displayName;
        const text = displayName || 'Silinmiş hesap.';
        canvas.printResponsiveText(text, 692, secondColumns[i], 270);
    }

    canvas.setTextAlign('center');
    canvas.setTextFont('normal 18px Kanit');

    for (let i = 0; i < 3; i++) {
        canvas.printResponsiveText(
            client.utils.numberToString(topData[0].topVoices[i] ? topData[0].topVoices[i]?.voices.total : 'Yok.', true),
            480,
            firstColumns[i] - 3,
            78,
        );
    }

    for (let i = 0; i < 3; i++) {
        canvas.printResponsiveText(
            topData[0].topMessages[i] ? topData[0].topMessages[i]?.messages.total : 'Yok.',
            1042,
            firstColumns[i] - 3,
            78,
        );
    }

    for (let i = 0; i < 3; i++) {
        canvas.printResponsiveText(
            client.utils.numberToString(
                topData[0].topCameras[i] ? topData[0].topCameras[i]?.cameras.total : 'Yok.',
                true,
            ),
            480,
            secondColumns[i] - 2,
            78,
        );
    }

    for (let i = 0; i < 3; i++) {
        canvas.printResponsiveText(
            client.utils.numberToString(
                topData[0].topStreams[i] ? topData[0].topStreams[i]?.streams.total : 'Yok.',
                true,
            ),
            1042,
            secondColumns[i] - 2,
            78,
        );
    }

    typeRow.components[0].options.forEach((option) => option.setDefault(false));
    typeRow.components[0].options[0].setDefault(true);

    const attachment = new AttachmentBuilder(canvas.png(), { name: 'top.png' });
    question.edit({ embeds: [], files: [attachment], components: [typeRow] });
}

export default allTimeTop;
