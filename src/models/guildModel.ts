import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { RankFlags } from '@/enums';

export interface IRank {
    type: RankFlags;
    count: number;
    role: string;
}

export interface IStreamChannel {
    owner: string;
    channel: string;
    channelName: string;
    permissions: string[];
}

export interface IPrivateRoom {
    owner: string;
    textChannel: string;
    voiceChannel: string;
    channelName: string;
    userPermissions: string[]
}

export class StatClass {
    ranks: IRank[];
    days: number;
    lastDay: number;
    removeOldRank: boolean;
    publicCategory: string;
    dailyPublic: number;
    lastPublic: number;
    streamCategory: string;
    secretCategory: string;
    dailyStream: number;
    lastStream: number;
    camChannels: string[];
    dailyCam: number;
    lastCam: number;
    generalChat: string;
    dailyGeneral: number;
    lastGeneral: number;
    dailyMessage: number;
    lastMessage: number;
    afkRoom: string;
    dailyAfk: number;
    lastAfk: number;
    dailyJoin: number;
    lastJoin: number;
    dailyLeave: number;
    lastLeave: number;
    dailyVoice: number;
    lastVoice: number;
    dailyStreamOpen: number;
    lastStreamOpen: number;
    dailyCamOpen: number;
    lastCamOpen: number;
    registerCategory: string;
    problemResolveCategory: string;
    staffTakeCategory: string;
    minStaffRole: string;
    streamerRole: string;
    owneredStreams: IStreamChannel[];
    owneredPrivate: IPrivateRoom[]
}

@modelOptions({ options: { customName: 'Guilds', allowMixed: 0 } })
export class GuildClass {
    @prop({ type: String, required: true })
    public id!: string;

    @prop({
        type: Object,
        default: {
            needName: true,
            registerSystem: true,
            invasionProtection: true,
            needAge: true,
            removeWarnRole: true,
            compliment: true,
            changeName: true,
            minAgePunish: true,
            maxMuteSystem: true,
            extraMute: true,
        },
    })
    public moderation: object;

    @prop({ type: Object, default: {} })
    public guard: object;

    @prop({
        type: Object,
        default: {
            messageStat: 1,
            messageStaffStat: 2,
            inviteStat: 70,
            sleepStat: 4,
            publicStat: 8,
            meetingStat: 500,
            noMute: true,
            eventFinishTimestamp: Date.now(),
            staffTakePoints: 70,
            taggedPoints: 70
        },
    })
    public point: object;

    @prop({
        type: Object,
        default: {
            removeOldRank: false,
            dailyPublic: 0,
            lastPublic: 0,
            dailyStream: 0,
            lastStream: 0,
            dailyCam: 0,
            lastCam: 0,
            dailyStreamOpen: 0,
            lastStreamOpen: 0,
            dailyCamOpen: 0,
            lastCamOpen: 0,
            dailyGeneral: 0,
            lastGeneral: 0,
            dailyMessage: 0,
            lastMessage: 0,
            dailyAfk: 0,
            lastAfk: 0,
            dailyJoin: 0,
            lastJoin: 0,
            dailyLeave: 0,
            lastLeave: 0,
            camChannels: [],
            dailyVoice: 0,
            lastVoice: 0,
            lastDay: new Date().setHours(0, 0, 0, 0),
            days: 1,
            owneredStreams: []
        },
    })
    public stat: StatClass;
}

export const GuildModel = getModelForClass(GuildClass);
