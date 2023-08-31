import { UserStatModel } from '@/models';
import { table } from 'table';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, codeBlock } from 'discord.js';
import moment from 'moment'
moment.locale("tr")

const Command: Stat.ICommand = {
    usages: ['üyeler', 'davetler', 'davetlerim', 'davetettiklerim', 'davet-ettiklerim', 'davetlilerim'],
    execute: async ({ client, message, args, guildData }) => {
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

        const document = await UserStatModel.find({ inviter: user.id, guild: message.guildId });
        if (!document || document.length < 1) {
            client.utils.sendTimedMessage(message, 'Belirttiğin kullanıcının verisi bulunmuyor.');
            return;
        }

        let datax = [["ID", "Kullanıcı adı", "Tarih", "Yetkili mi?"]];
		let config = {
			border: {
				topBody: ``,
				topJoin: ``,
				topLeft: ``,
				topRight: ``,

				bottomBody: ``,
				bottomJoin: ``,
				bottomLeft: ``,
				bottomRight: ``,

				bodyLeft: `│`,
				bodyRight: `│`,
				bodyJoin: `│`,

				joinBody: ``,
				joinLeft: ``,
				joinRight: ``,
				joinJoin: ``,
			},
		};
		let page = 1;
        const totalData = Math.ceil(document.length / 5);
        document.map(async(x) => {
            let member = message.guild.members.cache.get(x.id)
			datax.push([
				member.id,
				member.user.username,
				moment(x.date).format("LLL"),
		        member ? member.roles.cache.get(guildData.minStaffRole) ? "Yetkili" : "Değil" : "Sunucuda değil"
			]);
		});

		let outi = table(datax.slice(0, 5), config);

		const question = await message.channel.send({
            content: `${user} kişisinin davet bilgileri aşağıda belirtilmiştir. ${codeBlock("fix", outi)}`,
            components: document.length > 5 ? [client.utils.paginationButtons(page, totalData)] : [],
        });

        if (5 > document.length) return;

        const filter = (i: ButtonInteraction) => i.user.id === message.author.id && i.isButton();
        const collector = question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 5,
            componentType: ComponentType.Button,
        });

        collector.on('collect', (i: ButtonInteraction) => {
            i.deferUpdate();

            if (i.customId === 'first') page = 1;
            if (i.customId === 'previous') page -= 1;
            if (i.customId === 'next') page += 1;
            if (i.customId === 'last') page = totalData;

            question.edit({
				content: `${user} kişisinin davet bilgileri aşağıda belirtilmiştir. ${codeBlock("fix", outi.slice(page === 1 ? 0 : page * 5 - 5, page * 5))}`,
                components: [client.utils.paginationButtons(page, totalData)],
            });
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
    },
};

export default Command;
