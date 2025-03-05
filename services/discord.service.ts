import axios, {AxiosInstance} from "axios";
import {Logger} from "@motiadev/core";
import {appConfig} from "../config/default";

export interface EmailSummary {
  totalEmails: number;
  categoryCounts: Record<string, number>;
  urgencyCounts: Record<string, number>;
  autoRespondedCount: number;
}

export class DiscordService {
  private axios: AxiosInstance;

  constructor(private readonly logger: Logger) {
    this.axios = axios.create({
      baseURL: appConfig.discord.webhookUrl
    });
  }

  async send(summary: EmailSummary) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      this.logger.error('Discord webhook URL not configured');
      return false;
    }

    const embed = {
      title: '📧 Daily Email Summary',
      color: 0x4285F4, // Gmail blue color
      description: `Summary of emails processed on ${new Date().toISOString().split('T')[0]}`,
      fields: [
        {
          name: '📊 Total Emails',
          value: `${summary.totalEmails} emails processed`,
          inline: false
        },
        {
          name: '🏷️ Categories',
          value: Object.entries(summary.categoryCounts)
            .map(([category, count]) => `${category}: ${count}`)
            .join('\n') || 'None',
          inline: true
        },
        {
          name: '🚨 Urgency',
          value: Object.entries(summary.urgencyCounts)
            .map(([urgency, count]) => `${urgency}: ${count}`)
            .join('\n') || 'None',
          inline: true
        },
        {
          name: '🤖 Auto-responded',
          value: `${summary.autoRespondedCount} emails`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gmail Account Manager by Motia'
      }
    };

    try {
      await this.axios.post('', {
        embeds: [embed]
      });

      this.logger.info('Successfully sent daily summary to Discord');
    } catch (error) {
      this.logger.error(`Failed to send summary to Discord: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}

