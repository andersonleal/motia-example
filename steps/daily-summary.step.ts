import {CronConfig, StepHandler} from 'motia';
import {DiscordService, EmailSummary} from "../services/discord.service";

export const config: CronConfig = {
  type: 'cron',
  name: 'Daily Email Summary',
  description: 'Generates and sends a daily summary of processed emails to Discord',
  cron: '*/10 * * * * *',
  emits: ['gmail.summaryGenerated'],
  flows: ['gmail-flow']
};

interface ProcessedEmail {
  messageId: string;
  threadId: string;
  category: string;
  urgency: string;
  importance: string;
  processingTime: string;
}

export const handler: StepHandler<typeof config> = async ({emit, logger, state}) => {
  logger.info('Generating daily email summary');

  try {
    const summary: EmailSummary = {
      totalEmails: 0,
      categoryCounts: {},
      urgencyCounts: {},
      autoRespondedCount: 0
    };

    const processedEmailsRaw = await state.get<ProcessedEmail[]>('email_analysis', 'processed_emails') || [];
    const processedEmails: ProcessedEmail[] = Array.isArray(processedEmailsRaw) ? processedEmailsRaw : [];
    const autoResponses = await state.get<string[]>('email_analysis', 'auto_responded_emails') || [];

    logger.info(`Auto-responses: ${JSON.stringify(autoResponses)}`);
    logger.info(`Processed emails: ${JSON.stringify(processedEmails)}`);

    summary.totalEmails = processedEmails.length;

    processedEmails.forEach(email => {
      if (email.category) {
        summary.categoryCounts[email.category] = (summary.categoryCounts[email.category] || 0) + 1;
      }

      if (email.urgency) {
        summary.urgencyCounts[email.urgency] = (summary.urgencyCounts[email.urgency] || 0) + 1;
      }
    });

    summary.autoRespondedCount = autoResponses.filter(messageId => {
      const email = processedEmails.find(e => e.messageId === messageId);
      return email != null;
    }).length;

    logger.info(`Summary: ${JSON.stringify(summary)}`);

    if(summary.totalEmails === 0) {
      logger.info('No emails to send');
      return;
    }

    const discordService = new DiscordService(logger);
    await discordService.send(summary);

    state.set('email_analysis', 'auto_responded_emails', []);
    state.set('email_analysis', 'processed_emails', []);

    await emit({
      topic: 'gmail.summaryGenerated',
      data: {
        date: (new Date()).toISOString().split('T')[0],
        summary,
        sentToDiscord: true
      }
    });

    logger.info('Daily summary completed', {summary});
  } catch (error) {
    logger.error(`Error generating daily summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 