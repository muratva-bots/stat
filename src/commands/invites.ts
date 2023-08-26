import { UserStatModel } from '@/models';
import { Canvas, loadFont, loadImage } from 'canvas-constructor/skia';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { resolve } from 'path';

loadFont('Kanit', resolve(__dirname, '..', 'assets/Kanit-Regular.ttf'));

const specialColors = {
    1: '#90c2cc',
    2: '#ffd700',
    3: '#e07f1f',
};

const Command: Stat.ICommand = {
    usages: ['invites', 'invite', 'inv'],
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

        const document = await UserStatModel.find({ id: user.id, guild: message.guildId });
        if (!document) {
            client.utils.sendTimedMessage(message, 'Belirttiğin kullanıcının verisi bulunmuyor.');
            return;
        }

        let inviteToplam = "";
		for (let i = 0; i < document.length; i++) {
			const data = document[i];
			inviteToplam += `Toplam **${data.normalInvites}** davete sahip, **${data.normalInvites + data.suspectInvites}** bütün, **${data.leaveInvites}** ayrılan, **${data.suspectInvites}** sahte kullanıcı`;
		}

		const embed = new EmbedBuilder({
            color: client.utils.getRandomColor(),
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL({ forceStatic: true })
            },
            footer: {
                text: "Canzade was here!"
            },
            description: inviteToplam
        })
		

		message.channel.send({ embeds: [embed] });
    },
};

export default Command;
