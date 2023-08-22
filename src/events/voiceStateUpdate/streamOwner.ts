import { GuildModel, StatClass } from "@/models";
import { Client } from "@/structures";
import { VoiceChannel, VoiceState } from "discord.js";

function streamOwner(client: Client, state: VoiceState, guildData: StatClass) {
    if (state.channelId || !(guildData.owneredStreams || []).some((ow) => ow.owner === state.id)) return;

    const owneredChannel = (guildData.owneredStreams || []).find((ow) => ow.owner === state.id);
    setTimeout(async () => {
        const member = await client.utils.getMember(state.guild, state.id);
        if (member && member.voice && member.voice.channelId === owneredChannel.channel) return;
   
        const channel = state.guild.channels.cache.get(owneredChannel.channel) as VoiceChannel;
        if (channel) {
            channel.permissionOverwrites.cache
                .filter(p => !owneredChannel.permissions.includes(p.id))
                .forEach(p => channel.permissionOverwrites.delete(p.id));
            channel.edit({ name: owneredChannel.channelName, userLimit: 0 });
        }

        guildData.owneredStreams = guildData.owneredStreams.filter(ow => ow.channel !== owneredChannel.channel);
        await GuildModel.updateOne({ id: state.guild.id }, { $set: { "stat.owneredStreams": guildData.owneredStreams } }, { upsert: true });
    }, 1000 * 30);
}

export default streamOwner;
