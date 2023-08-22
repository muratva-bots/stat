import { Message, PermissionFlagsBits } from 'discord.js';

import { Client } from '@/structures';
import { StatClass } from '@/models';

function commandHandler(client: Client, message: Message, guildData: StatClass) {
    if (message.author.bot || !message.guild) return;

    const prefix = client.config.PREFIXES.find((p) => message.content.toLowerCase().trim().startsWith(p.toLowerCase()));
    if (!prefix) return;

    const [commandName, ...args] = message.content.slice(prefix.length).trim().split(' ');
    const command = client.commands.find((command) => command.usages.includes(commandName?.toLowerCase()));
    if (
        !command ||
        (guildData.generalChat === message.channelId &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator))
    )
        return;

    if (command.checkPermission && !command.checkPermission({ client, message, guildData })) return;
    command.execute({ client, message, args, guildData });
}

export default commandHandler;
