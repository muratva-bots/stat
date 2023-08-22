import { StatClass } from '@/models';
import { Client } from '@/structures';
import { ClientEvents, Message, User } from 'discord.js';

export {};

declare global {
    namespace Stat {
        export type EventKeys = keyof ClientEvents;

        export interface IEvent<K extends EventKeys> {
            name: EventKeys;
            execute: (client: Client, ...args: ClientEvents[K]) => Promise<void> | void;
        }

        export interface ICheckPermission {
            client: Client;
            message: Message;
            guildData: StatClass;
        }

        export interface ICommand {
            usages: string[];
            checkPermission?: ({ client, message }: ICheckPermission) => boolean;
            execute: (commandArgs: CommandArgs) => Promise<unknown> | unknown;
        }

        export interface CommandArgs {
            client: Client;
            message: Message;
            args: string[];
            guildData: StatClass;
        }

        export interface IVoiceBased {
            channelId: string;
            joinedTimestamp: number;
            joinedAt?: number;
        }

        export interface IInvite {
            uses: number;
            inviter: User;
            code: string;
        }
    }
}
