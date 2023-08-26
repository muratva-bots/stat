import { dailyStat } from '@/crons';
import { GuildModel, GuildClass } from '@/models';
import { addCameraStat, addStreamStat, addVoiceStat } from '@/structures';
import { Events, VoiceChannel } from 'discord.js';

const Ready: Stat.IEvent<Events.ClientReady> = {
    name: Events.ClientReady,
    execute: async (client) => {
        const guild = client.guilds.cache.get(client.config.GUILD_ID);
        if (!guild) {
            console.log('Guild is undefined.');
            return;
        }

        await guild.members.fetch();
        await guild.fetchOwner();
        dailyStat({ client, guild });

        const invites = await guild.invites.fetch();
        invites.forEach((i) =>
            client.invites.set(`${i.guild.id}-${i.code}`, {
                code: i.code,
                inviter: i.inviter,
                uses: i.uses,
            }),
        );

        console.log(`${client.user.tag} is online!`);

        await client.application.fetch();
        const document = (await GuildModel.findOne({ id: guild.id })) || (await GuildModel.create({ id: guild.id }));
        client.servers.set(guild.id, { ...document.stat });

        const now = Date.now();
        guild.members.cache
            .filter((m) => m.voice.channelId && !m.user.bot)
            .forEach((m) =>
                client.voices.set(m.id, { channelId: m.voice.channelId, joinedTimestamp: now, joinedAt: now }),
            );
        guild.members.cache
            .filter((m) => m.voice.channelId && m.voice.selfVideo && !m.user.bot)
            .forEach((m) => client.cameras.set(m.id, { channelId: m.voice.channelId, joinedTimestamp: now }));
        guild.members.cache
            .filter((m) => m.voice.channelId && m.voice.streaming && !m.user.bot)
            .forEach((m) => client.streams.set(m.id, { channelId: m.voice.channelId, joinedTimestamp: now }));

        setInterval(() => {
            const guildData = client.servers.get(guild.id);
            if (!guildData) return;

            const statNow = Date.now();
            client.streams.forEach(async (v, k) => {
                const channel = guild.channels.cache.get(v.channelId);
                if (!channel) return client.streams.delete(k);

                const diff = statNow - v.joinedTimestamp;
                if (!diff) return client.streams.delete(k);

                const member = await client.utils.getMember(guild, k);
                if (!member) return client.streams.delete(k);

                client.streams.set(k, {
                    channelId: v.channelId,
                    joinedTimestamp: statNow,
                });
                addStreamStat(member, channel as VoiceChannel, diff, guildData);
            });

            client.cameras.forEach(async (v, k) => {
                const channel = guild.channels.cache.get(v.channelId);
                if (!channel) return client.cameras.delete(k);

                const diff = statNow - v.joinedTimestamp;
                if (!diff) return client.cameras.delete(k);

                const member = await client.utils.getMember(guild, k);
                if (!member) return client.streams.delete(k);

                client.cameras.set(k, {
                    channelId: v.channelId,
                    joinedTimestamp: statNow,
                });
                addCameraStat(member, channel as VoiceChannel, diff, guildData);
            });

            client.voices.forEach(async (v, k) => {
                const channel = guild.channels.cache.get(v.channelId);
                if (!channel) return;

                const diff = statNow - v.joinedTimestamp;
                if (!diff) return;

                const member = await client.utils.getMember(guild, k);
                if (!member) return;

                client.voices.set(k, {
                    channelId: v.channelId,
                    joinedTimestamp: statNow,
                });
                if (!member.voice.mute) addVoiceStat(client, member, channel as VoiceChannel, diff, guildData);
            });
        }, 1000 * 60);

        const guildEventEmitter = GuildModel.watch([{ $match: { 'fullDocument.id': guild.id } }], {
            fullDocument: 'updateLookup',
        });
        guildEventEmitter.on('change', ({ fullDocument }: { fullDocument: GuildClass }) =>
            client.servers.set(guild.id, { ...fullDocument.stat }),
        );
    },
};

export default Ready;
