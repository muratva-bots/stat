import { StatClass } from '@/models';
import { Client, addStreamStat } from '@/structures';
import { VoiceChannel, VoiceState } from 'discord.js';

function streamStat(client: Client, oldState: VoiceState, newState: VoiceState, guildData: StatClass) {
    if (!oldState.streaming && !newState.streaming) return;

    const now = Date.now();
    const cameraCached = client.streams.get(newState.id);
    if (!cameraCached && newState.streaming) {
        client.cameras.set(newState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
        });
    }

    if (!oldState.streaming && newState.streaming && cameraCached) {
        const diff = now - cameraCached.joinedTimestamp;
        if (diff) addStreamStat(newState.member, newState.channel as VoiceChannel, diff, guildData);
        client.cameras.delete(newState.id);
    }

    if (oldState.streaming && !newState.streaming) {
        client.streams.set(newState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
        });
    }
}

export default streamStat;
