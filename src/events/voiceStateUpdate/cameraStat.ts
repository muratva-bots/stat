import { StatClass } from '@/models';
import { Client, addCameraStat } from '@/structures';
import { VoiceChannel, VoiceState } from 'discord.js';

function cameraStat(client: Client, oldState: VoiceState, newState: VoiceState, guildData: StatClass) {
    if (!oldState.selfVideo && !newState.selfVideo) return;

    const now = Date.now();
    const cameraCached = client.cameras.get(newState.id);
    if (!cameraCached && newState.selfVideo) {
        client.cameras.set(newState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
        });
    }

    if (!oldState.selfVideo && newState.selfVideo && cameraCached) {
        const diff = now - cameraCached.joinedTimestamp;
        if (diff) addCameraStat(newState.member, newState.channel as VoiceChannel, diff, guildData);
        client.cameras.delete(newState.id);
    }

    if (oldState.selfVideo && !newState.selfVideo) {
        client.cameras.set(newState.id, {
            channelId: newState.channelId,
            joinedTimestamp: now,
        });
    }
}

export default cameraStat;
