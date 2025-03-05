import {EventConfig, StepHandler} from 'motia'
import { GoogleService } from 'services/google.service';
import {z} from 'zod'

type Category = 'work' | 'personal' | 'spam' | 'promotional' | 'social' | 'other' | 'unknown';
type Urgency = 'high' | 'medium' | 'low';

const inputSchema = z.object({
  messageId: z.string(),
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
})

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'Organize Email',
  description: 'Organizes emails based on analysis, applies labels, and archives if necessary',
  subscribes: ['gmail.email.analyzed'],
  emits: ['gmail.email.organized', 'gmail.email.organization.failed'],
  input: inputSchema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (input, {emit, logger}) => {
  logger.info(`Organizing email: ${input.messageId} ${input.category} ${input.urgency}`)

  try {
    const labelMappings: Record<Category, string> = {
      work: 'Work',
      personal: 'Personal',
      spam: 'Spam',
      unknown: 'Unknown',
      promotional: 'Promotional',
      social: 'Social',
      other: 'Other'
    }

    const urgencyLabels: Record<Urgency, string> = {
      high: 'Urgent',
      medium: 'Normal',
      low: 'Low-Priority'
    }

    const labelsToApply: string[] = [];
    const labelIds: string[] = [];
    const googleService = new GoogleService(logger);

    async function processLabel(labelName: string): Promise<void> {
      const label = await googleService.findOrCreateLabel(labelName);

      logger.info(`Label ${labelName} created: ${label.id}`);

      if (label.id) {
        labelIds.push(label.id);
        labelsToApply.push(labelName);
      }
    }

    const categoryValue = input.category.category as Category;
    const categoryLabel = labelMappings[categoryValue];
    if (categoryLabel) {
      await processLabel(categoryLabel);
    }

    const urgencyValue = input.urgency.urgency as Urgency;
    const urgencyLabel = urgencyLabels[urgencyValue];
    if (urgencyLabel) {
      await processLabel(urgencyLabel);
    }

    if (labelIds.length > 0) {
      await googleService.modifyMessage(input.messageId, labelIds);
      logger.info(`Applied labels to email: ${labelsToApply.join(', ')}`);
    }

    // Emit success event
    await emit({
      topic: 'gmail.email.organized',
      data: {
        messageId: input.messageId,
        appliedLabels: labelsToApply
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to organize email: ${errorMessage}`, {error})

    await emit({
      topic: 'gmail.email.organization.failed',
      data: {
        messageId: input.messageId,
        error: errorMessage
      }
    })
  }
}
