import { Client as Core, GatewayIntentBits, ActivityType, Collection } from 'discord.js';
import { connect } from 'mongoose';

import { Utils } from './Utils';
import config from '../../config.json';
import { StatClass } from '@/models';

export class Client extends Core {
    commands = new Collection<string, Stat.ICommand>();
    servers = new Collection<string, StatClass>();
    voices = new Collection<string, Stat.IVoiceBased>();
    streams = new Collection<string, Stat.IVoiceBased>();
    cameras = new Collection<string, Stat.IVoiceBased>();
    invites = new Collection<string, Stat.IInvite>();
    utils = new Utils(this);
    config = config;

    constructor() {
        super({
            intents: Object.keys(GatewayIntentBits).map((intent) => GatewayIntentBits[intent]),
            presence: {
                activities: [{ name: config.STATUS, type: ActivityType.Watching }],
            },
        });
    }

    async connect() {
        console.log('Loading bot commands...');
        await this.utils.loadCommands();

        console.log('Loading bot events...');
        await this.utils.loadEvents();

        console.log('Connecting mongo...');
        await connect(this.config.MONGO_URL);

        await this.login(this.config.TOKEN);
    }
}
