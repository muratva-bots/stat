export const SETTINGS = [
    {
        name: 'Roller',
        value: 'ranks',
        description: 'Role verdirtme işte.',
        type: 'ranks',
    },
    {
        name: 'Rol Kaldırma',
        value: 'removeOldRank',
        description: 'Eski rol kalksın mı.',
        type: 'boolean',
    },
    {
        name: 'Public Kategori',
        value: 'publicCategory',
        description: 'Public işte.',
        type: 'channel',
        isParent: true,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'Stream Kategori',
        value: 'streamCategory',
        description: 'Stream işte.',
        type: 'channel',
        isParent: true,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'Kamera Kanalları',
        value: 'camChannels',
        description: 'Kamera Kanalları işte.',
        type: 'channel',
        isParent: false,
        isVoice: true,
        isMultiple: true,
    },
    {
        name: 'Chat',
        value: 'generalChat',
        description: 'Chat işte.',
        type: 'channel',
        isParent: false,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'AFK Kanalı',
        value: 'afkRoom',
        description: 'AFK Kanalı işte.',
        type: 'channel',
        isParent: false,
        isVoice: true,
        isMultiple: false,
    },
    {
        name: 'Register Kategori',
        value: 'registerCategory',
        description: 'Register işte.',
        type: 'channel',
        isParent: true,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'Sorun Çözme Kategori',
        value: 'problemResolveCategory',
        description: 'Sorun Çözme işte.',
        type: 'channel',
        isParent: true,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'Yetkili Alım Kategori',
        value: 'staffTakeCategory',
        description: 'Yetkili Alım işte.',
        type: 'channel',
        isParent: true,
        isVoice: false,
        isMultiple: false,
    },
    {
        name: 'En Alt Yetkili Rolü',
        value: 'minStaffRole',
        description: 'En alt yetkili rolü işte.',
        type: 'role'
    },
    {
        name: 'Streamer Rolü',
        value: 'streamerRole',
        description: 'Streamer rolü işte.',
        type: 'role'
    },
];
