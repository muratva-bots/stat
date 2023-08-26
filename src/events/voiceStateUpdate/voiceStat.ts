import { StatClass } from '@/models';
import { Client, addVoiceStat } from '@/structures';
import { VoiceChannel, VoiceState } from 'discord.js';

async function voiceStat(client: Client, oldState: VoiceState, newState: VoiceState, guildData: StatClass) {
    const now = Date.now();

    if (!oldState.channelId && newState.channelId) {
        client.voices.set(oldState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
            joinedAt: now,
        });
        return;
    }

    if (oldState.channelId && !newState.channelId) {
        const voiceCache = client.voices.get(oldState.id);
        if (!voiceCache) return;

        const diffValue = now - voiceCache.joinedTimestamp;
        if (diffValue) addVoiceStat(client, oldState.member, oldState.channel as VoiceChannel, diffValue, guildData);
        client.voices.delete(oldState.id);
        return;
    }

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const voiceCache = client.voices.get(oldState.id);
        if (voiceCache) {
            const diffValue = now - voiceCache.joinedTimestamp;
            if (diffValue) addVoiceStat(client, oldState.member, oldState.channel as VoiceChannel, diffValue, guildData);
        }
        
        client.voices.set(`${oldState.member.guild.id}-${oldState.id}`, {
            channelId: newState.channelId,
            joinedTimestamp: now,
            joinedAt: now,
        });
        return;
    }
}

export default voiceStat;
