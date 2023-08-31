import { GuildModel, UserStatModel } from '@/models';
import { Events } from 'discord.js';

const GuildMemberRemove: Stat.IEvent<Events.GuildMemberRemove> = {
    name: Events.GuildMemberRemove,
    execute: async (client, member) => {
        if (member.user.bot) return;

        const guildData = client.servers.get(member.guild.id);
        if (!guildData) return;

        guildData.dailyLeave++;
        await GuildModel.updateOne(
            { id: member.guild.id },
            { $set: { 'stat.dailyLeave': guildData.dailyLeave } },
            { upsert: true },
        );

        const memberData = await UserStatModel.findOne({ id: member.id, guild: member.guild.id });
        if (!memberData || !memberData.inviter) return;

        memberData.inviter = undefined;
        memberData.markModified("inviter");
        memberData.save();

        const inviterData = await UserStatModel.findOne({ id: memberData.inviter, guild: member.guild.id });
        if (!inviterData) return;

        if (inviterData.normalInvites > 0) inviterData.normalInvites -= 1;
        inviterData.leaveInvites += 1;
        memberData.markModified("leaveInvites normalInvites");
        inviterData.save();
    },
};

export default GuildMemberRemove;
