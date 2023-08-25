import { StatClass } from '@/models';
import { Events } from 'discord.js';
import streamRoom from './streamRoom';
import privateRoom from './privateRoom';


const InteractionCreate: Stat.IEvent<Events.InteractionCreate> = {
    name: Events.InteractionCreate,
    execute: async (client, interaction) => {
        const guildData = client.servers.get(interaction.guildId) || new StatClass();
       
    //    if (interaction.isButton()) privateRoom(client, interaction, guildData);
        if (interaction.isButton()) streamRoom(client, interaction, guildData);

    },
};

export default InteractionCreate;
