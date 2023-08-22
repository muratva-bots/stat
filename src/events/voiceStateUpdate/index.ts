import { Events } from 'discord.js';

import voiceStat from './voiceStat';
import streamStat from './streamStat';
import cameraStat from './cameraStat';
import streamOwner from './streamOwner';

const VoiceStateUpdate: Stat.IEvent<Events.VoiceStateUpdate> = {
    name: Events.VoiceStateUpdate,
    execute: async (client, oldState, newState) => {
        if (!oldState.member.guild || oldState.member.user.bot || newState.member.user.bot) return;

        const guildData = client.servers.get(oldState.guild.id);
        if (!guildData) return;

        streamOwner(client, newState, guildData);
        voiceStat(client, oldState, newState, guildData);
        streamStat(client, oldState, newState, guildData);
        cameraStat(client, oldState, newState, guildData);
    },
};

export default VoiceStateUpdate;
