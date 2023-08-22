import { readdirSync } from 'fs';
import { resolve } from 'path';

import { Client } from '@/structures';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    Guild,
    GuildMember,
    Message,
    PermissionFlagsBits,
    PermissionOverwrites,
    Snowflake,
    User,
    time,
} from 'discord.js';
import { EMOJIS } from '@/assets';

export class Utils {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    chunkArray(array: any[], chunkSize: number) {
        const chunkedArray = [];
        for (let i = 0; i < array.length; i += chunkSize) chunkedArray.push(array.slice(i, i + chunkSize));
        return chunkedArray;
    }

    paginationButtons(page: number, totalData: number) {
        return new ActionRowBuilder<ButtonBuilder>({
            components: [
                new ButtonBuilder({
                    custom_id: 'first',
                    emoji: {
                        id: '1070037431690211359',
                    },
                    style: ButtonStyle.Secondary,
                    disabled: page === 1,
                }),
                new ButtonBuilder({
                    custom_id: 'previous',
                    emoji: {
                        id: '1061272577332498442',
                    },
                    style: ButtonStyle.Secondary,
                    disabled: page === 1,
                }),
                new ButtonBuilder({
                    custom_id: 'count',
                    label: `${page}/${totalData}`,
                    style: ButtonStyle.Secondary,
                    disabled: true,
                }),
                new ButtonBuilder({
                    custom_id: 'next',
                    emoji: {
                        id: '1061272499670745229',
                    },
                    style: ButtonStyle.Secondary,
                    disabled: totalData === page,
                }),
                new ButtonBuilder({
                    custom_id: 'last',
                    emoji: {
                        id: '1070037622820458617',
                    },
                    style: ButtonStyle.Secondary,
                    disabled: page === totalData,
                }),
            ],
        });
    }

    getPermissions(permission: PermissionOverwrites) {
        const permissions = {};
        Object.keys(PermissionFlagsBits).forEach((p) => (permissions[p] = null));

        const deny = permission.deny;
        const allow = permission.allow;

        Object.keys(PermissionFlagsBits).forEach((p) => {
            if (allow.has(PermissionFlagsBits[p]) && !deny.has(PermissionFlagsBits[p])) {
                permissions[p] = true;
            } else if (!allow.has(PermissionFlagsBits[p]) && deny.has(PermissionFlagsBits[p])) {
                permissions[p] = false;
            }
        });

        return permissions;
    }

    getEmoji(name: string) {
        const clientEmoji = this.client.emojis.cache.find((e) => e.name === name);
        return clientEmoji ? clientEmoji.toString() : EMOJIS.find((e) => e.name === name).default;
    }

    isSnowflake(id: string): id is Snowflake {
        return BigInt(id).toString() === id;
    }

    setRoles(member: GuildMember, params: string[] | string): Promise<GuildMember> {
        if (!member.manageable) return undefined;

        const roles = member.roles.cache
            .filter((role) => role.managed)
            .map((role) => role.id)
            .concat(params);
        return member.roles.set(roles);
    }

    splitMessage(text: string, { maxLength = 2000, char = '\n', prepend = '', append = '' } = {}) {
        if (text.length <= maxLength) return [append + text + prepend];
        const splitText = text.split(char);
        const messages = [];
        let msg = '';
        for (const chunk of splitText) {
            if (msg && (msg + char + chunk + append).length > maxLength) {
                messages.push(msg + append);
                msg = prepend;
            }
            msg += (msg && msg !== prepend ? char : '') + chunk;
        }
        return messages.concat(msg).filter((m) => m);
    }

    async getMember(guild: Guild, id: string): Promise<GuildMember> {
        if (!id || !this.isSnowflake(id.replace(/\D/g, ''))) return;

        const cache = guild.members.cache.get(id.replace(/\D/g, ''));
        if (cache) return cache;

        let result;
        try {
            result = await guild.members.fetch({ user: id.replace(/\D/g, ''), force: true, cache: true });
        } catch (e) {
            result = undefined;
        }
        return result;
    }

    async getUser(id: string): Promise<User> {
        if (!id || !this.isSnowflake(id.replace(/\D/g, ''))) return;

        const cache = this.client.users.cache.get(id.replace(/\D/g, ''));
        if (cache) return cache;

        let result;
        try {
            result = await this.client.users.fetch(id.replace(/\D/g, ''), { force: true, cache: true });
        } catch (e) {
            result = undefined;
        }
        return result;
    }

    numberToString(milliseconds: number, short: boolean = false) {
        if (!milliseconds) return 'Bulunmuyor.';

        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        if (short) return `${hours}s`;

        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours},${minutes} saat`;
    }

    sendTimedMessage(message: Message, content: string, time = 1000 * 5) {
        message
            .reply({ content })
            .then((msg) => {
                setTimeout(() => msg.delete(), time);
            })
            .catch(() => undefined);
    }

    getRandomColor() {
        return Math.floor(Math.random() * (0xffffff + 1));
    }

    async loadCommands() {
        const files = readdirSync(resolve(__dirname, '..', 'commands'));
        files.forEach(async (fileName) => {
            const commandFile = await import(resolve(__dirname, '..', 'commands', fileName));
            delete require.cache[commandFile];

            const command = commandFile.default as Stat.ICommand;
            this.client.commands.set(command.usages[0], { ...command });
        });
    }

    async loadEvents() {
        const files = readdirSync(resolve(__dirname, '..', 'events'));
        files.forEach(async (fileName) => {
            const eventFile = await import(resolve(__dirname, '..', 'events', fileName));
            delete require.cache[eventFile];

            const event = eventFile.default;
            this.client.on(event.name, (...args: unknown[]) => event.execute(this.client, ...args));
        });
    }
}
