import { GuildModel, UserStatModel } from '@/models';
import { Events, TextChannel, bold, inlineCode } from 'discord.js';

const GuildMemberRemove: Stat.IEvent<Events.GuildMemberRemove> = {
    name: Events.GuildMemberRemove,
    execute: async (client, member) => {
        if (member.user.bot) return;

        const guildData = client.servers.get(member.guild.id);
        if (!guildData) return;
        const logChannel = member.guild.channels.cache.find(c => c.name === "invite") as TextChannel

        guildData.dailyLeave++;
        await GuildModel.updateOne(
            { id: member.guild.id },
            { $set: { 'stat.dailyLeave': guildData.dailyLeave } },
            { upsert: true },
        );

        const memberData = await UserStatModel.findOne({ id: member.id, guild: member.guild.id });
        if (!memberData || !memberData.inviter) {
            logChannel.send({ content: `${client.utils.getEmoji("back")} ${member} üyesi sunucumuzdan ayrıldı. ${bold("ÖZEL URL")} tarafından davet edilmişti.` })
            return
        } 
        
        const inviterData = await UserStatModel.findOne({ id: memberData.inviter, guild: member.guild.id });
        if (!inviterData) {
            logChannel.send({ content: `${client.utils.getEmoji("back")} ${member} üyesi sunucumuzdan ayrıldı. Kim tarafından davet edildiği bulunamadı.` })
            return
        }

       memberData.inviter = undefined;
        memberData.markModified("inviter");
        memberData.save();
 
        const inviter = await client.users.fetch(inviterData.id)
        if (inviterData.normalInvites > 0) inviterData.normalInvites -= 1;
        inviterData.leaveInvites += 1;
        inviterData.markModified("leaveInvites normalInvites");
        inviterData.save();
        logChannel.send({ content: `${client.utils.getEmoji("back")} ${member} üyesi sunucumuzdan ayrıldı. ${inlineCode(inviter.username)} tarafından davet edilmişti bu kişinin toplam (${bold(`${inviterData.normalInvites}`)}) daveti oldu.` })
        return
    },
};

export default GuildMemberRemove;