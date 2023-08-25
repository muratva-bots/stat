import mainHandler from './mainHandler';

const Command: Stat.ICommand = {
    usages: ['setup', 'kur'],
    checkPermission: ({ client, message }) => {
        const ownerID =
           client.config.BOT_OWNERS
        return ownerID.includes(message.author.id);
    },
    execute: ({ client, message, guildData }) => {
        mainHandler(client, message, guildData);
    },
};

export default Command;