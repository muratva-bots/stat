import { UserStatModel } from '@/models';
import { EmbedBuilder, bold } from 'discord.js';

const Command: Stat.ICommand = {
    usages: ['invites', 'invite', 'inv', 'davet'],
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

        const invitingUsers = await UserStatModel.find({ inviter: user.id, guild: message.guildId });
        const now = Date.now();
        const weeklyTotal = invitingUsers.filter(inv => 
            message.guild.members.cache.has(inv.id) && 
            1000 * 60 * 60 * 24 * 7 >= (now - message.guild.members.cache.get(inv.id).joinedTimestamp)
        ).length

		const embed = new EmbedBuilder({
            color: client.utils.getRandomColor(),
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL({ forceStatic: true })
            },
            footer: {
                text: client.config.STATUS
            },
            description: `Toplam ${bold((document.normalInvites + document.suspectInvites).toString())} daveti bulunuyor. (${
                bold(document.normalInvites.toString())
            } normal, ${bold(document.leaveInvites.toString())} ayrılan, ${
                bold(document.suspectInvites.toString())
            } sahte kullanıcı, ${bold(weeklyTotal.toString())} haftalık)`
        });

		message.channel.send({ embeds: [embed] });
    },
};

export default Command;
