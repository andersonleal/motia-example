import {EventConfig, StepHandler} from 'motia';
import {GoogleService} from '../services/google.service';
import {z} from 'zod';

// Define the schema for categorized emails
const categorizedEmailSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  subject: z.string(),
  from: z.string(),
  category: z.object({
    category: z.string(),
    confidence: z.number()
  }),
  urgency: z.object({
    urgency: z.string(),
    score: z.number(),
    factors: z.object({
      subject_keyword_urgent: z.number(),
      keyword_score: z.number(),
      low_urgency_modifier: z.number(),
      sentiment_score: z.number(),
      time_phrase_tomorrow: z.number().optional(),
      time_phrase_by_eod: z.number().optional()
    })
  }),
  importance: z.object({
    importance: z.string(),
    score: z.number(),
    factors: z.object({
      vip_sender: z.number()
    })
  })
});

// Define the step configuration
export const config: EventConfig<typeof categorizedEmailSchema> = {
  type: 'event',
  name: 'Gmail Auto Responder',
  description: 'Automatically replies to emails based on their category and urgency',
  subscribes: ['gmail.email.analyzed'],
  emits: ['gmail.email.replied'],
  input: categorizedEmailSchema,
  flows: ['gmail-flow']
};

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  try {

    const googleService = new GoogleService(logger);
    await googleService.sendEmail(input);

    logger.info(`Auto-response sent`);

    await emit({
      topic: 'gmail.email.replied',
      data: {
        id: input.messageId,
        threadId: input.threadId,
        subject: input.subject,
        responseType: input.category,
        autoReplied: true
      }
    });
    await state.set('email_analysis', 'auto_responded_emails', [input.messageId]);

  } catch (error) {
    logger.error(`Failed to send auto-response ${String(error)}`);
  }
}; 