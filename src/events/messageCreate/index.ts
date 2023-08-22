import { Events } from 'discord.js';
import messageStatHandler from './messageStatHandler';
import { StatClass } from '@/models';
import commandHandler from './commandHandler';

const MessageCreate: Stat.IEvent<Events.MessageCreate> = {
    name: Events.MessageCreate,
    execute: async (client, message) => {
        if (message.author.bot || !message.guild) return;

        const guildData = client.servers.get(message.guildId) || new StatClass();

        commandHandler(client, message, guildData);
        messageStatHandler(message, guildData);
    },
};

export default MessageCreate;
