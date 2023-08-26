import { StatClass } from '@/models';
import { Client, addStreamStat } from '@/structures';
import { VoiceChannel, VoiceState } from 'discord.js';

function streamStat(client: Client, oldState: VoiceState, newState: VoiceState, guildData: StatClass) {
    if (!oldState.streaming && !newState.streaming) return;

    const now = Date.now();
    
    if (!oldState.streaming && newState.streaming) {
        client.streams.set(newState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
        });
        return;
    }

    if (oldState.streaming && !newState.streaming) {
        const streamCached = client.streams.get(newState.id);
        if (!streamCached) return;

        const diff = now - streamCached.joinedTimestamp;
        if (diff) addStreamStat(newState.member, newState.channel as VoiceChannel, diff, guildData);
        client.streams.delete(newState.id);
        return;
    }
}

export default streamStat;
