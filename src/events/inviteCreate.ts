import { Events } from 'discord.js';

const InviteCreate: Stat.IEvent<Events.InviteCreate> = {
    name: Events.InviteCreate,
    execute: (client, invite) => {
        client.invites.set(`${invite.guild.id}-${invite.code}`, {
            code: invite.code,
            inviter: invite.inviter,
            uses: invite.uses,
        });
    },
};

export default InviteCreate;
