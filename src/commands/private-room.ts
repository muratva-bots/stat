import { GuildModel } from "@/models";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, channelMention, escapeMarkdown, inlineCode, userMention } from "discord.js";

const Command: Stat.ICommand = {
    usages: ["privateroom"],
    checkPermission: ({ client, message, guildData }) => {
        const ownerID =
           client.config.BOT_OWNERS
        return ownerID.includes(message.author.id);
    },
    execute: async ({ message, guildData }) => {
        const buttonRow = new ActionRowBuilder<ButtonBuilder>({
            components: [
                new ButtonBuilder({
                    custom_id: "ozel-oda",
                    label: "Özel oda oluştur",
                    style: ButtonStyle.Secondary
                }),
               
            ]
        });

		await message.channel.send({
			content: `
**Merhaba!** Secret odalar çok fazla yer kapladığı için onları sildik.

Bunun yerine aşağıdaki butondan sadece sana ait özel ses ve ses kanalını düzenleyebileceğin bir metin kanalı oluşturabilirsin.

**Unutma:** Özel odanda kimse bulunmadığında kanal 5 dakika sonra silinir, eğer istersen kanalını yeniden oluşturabilirsin.`,
			components: [buttonRow],
		});
    }
}

export default Command;
