import { Events } from 'discord.js';

const InviteDelete: Stat.IEvent<Events.InviteDelete> = {
    name: Events.InviteDelete,
    execute: (client, invite) => {
        client.invites.delete(`${invite.guild.id}-${invite.code}`);
    },
};

export default InviteDelete;
