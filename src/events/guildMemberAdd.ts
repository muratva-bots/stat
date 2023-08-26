import { GuildModel, UserStatModel } from '@/models';
import { Events, TextChannel } from 'discord.js';

const GuildMemberAdd: Stat.IEvent<Events.GuildMemberAdd> = {
    name: Events.GuildMemberAdd,
    execute: async (client, member) => {
        if (member.user.bot) return;

        const guildData = client.servers.get(member.guild.id);
        if (!guildData) return;
        const logChannel = member.guild.channels.cache.find(c => c.name === "invite") as TextChannel
        guildData.dailyJoin++;

        const invites = await member.guild.invites.fetch();
        const notHasInvite = client.invites.find((i) => !invites.has(i.code));
        const invite =
            invites.find(
                (i) =>
                    client.invites.has(`${member.guild.id}-${i.code}`) &&
                    i.uses > client.invites.get(`${member.guild.id}-${i.code}`).uses,
            ) || notHasInvite;
            const isSuspect = 1000 * 60 * 60 * 24 * 7 >= Date.now() - member.user.createdTimestamp;
        if (!invite || !invite.inviter) {
            await GuildModel.updateOne({ id: member.guild.id }, { $set: { stat: guildData } }, { upsert: true });
            logChannel.send(
                `${member} üyesi **sunucumuza ÖZEL URL kullanarak katıldı!** ${
                    isSuspect ? `🚫` : ``
                }`,
            );
            return;
        }

        await GuildModel.updateOne({ id: member.guild.id }, { $set: { stat: guildData } }, { upsert: true });

        if (notHasInvite) client.invites.delete(`${member.guild.id}-${invite.code}`);
        else {
            client.invites.set(`${member.guild.id}-${invite.code}`, {
                code: invite.code,
                inviter: invite.inviter,
                uses: invite.uses,
            });
        }

        await UserStatModel.updateOne(
            { id: member.id, guild: member.guild.id },
            { $set: { inviter: invite.inviter.id } },
            { upsert: true },
        );

        await UserStatModel.updateOne(
            { id: invite.inviter.id, guild: member.guild.id },
            { $inc: { suspectInvites: isSuspect ? 1 : 0, normalInvites: isSuspect ? 0 : 1 } },
            { upsert: true },
        );

        
      
        const document = await UserStatModel.findOne({ id: invite.inviter.id, guild: member.guild.id });

        logChannel.send(
            `${member} üyesi sunucumuza **${invite.inviter.username}** tarafından davet edildi, ve bu kişinin ${document.normalInvites} daveti oldu.`,
        );
    },
};

export default GuildMemberAdd;
