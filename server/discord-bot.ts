import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN não definido nas variáveis de ambiente");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.on("ready", () => {
  console.log(`✅ Bot conectado como ${client.user?.tag}`);
  client.user?.setActivity("bots saudáveis 🟢", { type: "WATCHING" });

  registerCommands();
});

async function registerCommands() {
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("pinger")
        .setDescription("Verificar saúde dos bots")
        .setDefaultMemberPermissions(8), // Apenas admins
    ];

    await client.application?.commands.set(commands);
    console.log("✅ Slash commands registrados");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    // Slash command /pinger
    if (interaction.isCommand()) {
      if (interaction.commandName === "pinger") {
        // Verifica se é admin
        if (!interaction.member?.permissions.has("ADMINISTRATOR")) {
          await interaction.reply({
            content: "❌ Apenas administradores podem usar este comando!",
            ephemeral: true,
          });
          return;
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_modal_verificacao")
            .setLabel("✅ Verificar Saúde do Meu Bot")
            .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
          .setColor("#00AA00")
          .setTitle("🔍 Verificador de Saúde de Bots")
          .setDescription("Clique no botão abaixo para verificar a saúde do seu bot!")
          .setFooter({ text: `Requisitado por ${interaction.user.username}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    // Button: Abrir Modal
    if (interaction.isButton()) {
      if (interaction.customId === "abrir_modal_verificacao") {
        const modal = new ModalBuilder()
          .setCustomId("modal_busca_bot")
          .setTitle("🔍 Buscar Bot");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("input_nome")
              .setLabel("Nome do Bot (opcional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("input_url")
              .setLabel("URL do Bot (opcional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("input_client_id")
              .setLabel("Client ID do Bot (opcional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        await interaction.showModal(modal);
      }

      // Button: Atualizar Saúde
      if (interaction.customId.startsWith("atualizar_saude_")) {
        await interaction.deferReply({ ephemeral: true });

        const botId = interaction.customId.replace("atualizar_saude_", "");

        // Chama seu backend para atualizar
        const novoStatus = await atualizarSaudeBot(botId);

        const embed = new EmbedBuilder()
          .setColor("#00AA00")
          .setTitle("✅ Bot Atualizado com Sucesso!")
          .addFields(
            { name: "Nova Saúde", value: `${novoStatus.health}%`, inline: true },
            { name: "Status", value: "🟢 Online", inline: true },
            { name: "Latência", value: `${novoStatus.latency}ms`, inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    }

    // Modal Submit: Busca Bot
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "modal_busca_bot") {
        await interaction.deferReply({ ephemeral: true });

        const nome = interaction.fields.getTextInputValue("input_nome");
        const url = interaction.fields.getTextInputValue("input_url");
        const clientId = interaction.fields.getTextInputValue("input_client_id");

        // Valida se pelo menos um campo foi preenchido
        if (!nome && !url && !clientId) {
          await interaction.editReply({
            content: "❌ Preencha pelo menos um campo!",
          });
          return;
        }

        // Chama seu backend para buscar o bot
        const bot = await buscarBot({
          nome: nome || undefined,
          url: url || undefined,
          clientId: clientId || undefined,
        });

        if (!bot) {
          await interaction.editReply({
            content: "❌ Bot não encontrado. Verifique os dados e tente novamente.",
          });
          return;
        }

        // Calcula cor baseado na saúde
        const cor = bot.health >= 50 ? "#00AA00" : "#FF5500";

        const statusEmbed = new EmbedBuilder()
          .setColor(cor)
          .setTitle(`📊 Saúde do Bot: ${bot.nome}`)
          .addFields(
            {
              name: "Saúde",
              value: `${bot.health}%`,
              inline: true,
            },
            {
              name: "Status",
              value: bot.health >= 50 ? "🟢 Saudável" : "🔴 Crítico",
              inline: true,
            },
            {
              name: "Latência",
              value: `${bot.latency}ms`,
              inline: true,
            },
            {
              name: "URL",
              value: bot.url,
              inline: false,
            },
            {
              name: "Client ID",
              value: bot.clientId,
              inline: false,
            },
            {
              name: "Último Ping",
              value: new Date(bot.lastPing).toLocaleString("pt-BR"),
              inline: false,
            }
          )
          .setTimestamp();

        const row = new ActionRowBuilder();

        // Botão de atualizar aparece apenas se saúde < 50%
        if (bot.health < 50) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`atualizar_saude_${bot.id}`)
              .setLabel("🔄 Atualizar Saúde")
              .setStyle(ButtonStyle.Danger)
          );
        }

        await interaction.editReply({
          embeds: [statusEmbed],
          components: row.components.length > 0 ? [row] : [],
        });
      }
    }
  } catch (error) {
    console.error("❌ Erro na interação:", error);
    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Ocorreu um erro!",
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// Funções para chamar seu backend
async function buscarBot(filtros) {
  try {
    // Substitua pela URL real do seu backend
    const response = await fetch("http://localhost:3000/api/bots/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtros),
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao buscar bot:", error);
    return null;
  }
}

async function atualizarSaudeBot(botId) {
  try {
    // Substitua pela URL real do seu backend
    const response = await fetch(`http://localhost:3000/api/bots/${botId}/ping`, {
      method: "POST",
    });

    if (!response.ok) {
      return { health: 0, latency: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao atualizar saúde:", error);
    return { health: 0, latency: 0 };
  }
}

client.login(process.env.BOT_TOKEN);

export { client };