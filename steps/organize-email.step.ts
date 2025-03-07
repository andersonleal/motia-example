import { EventConfig, StepHandler } from 'motia';
import { z } from 'zod';
import { GoogleService } from '../services/google.service';

const inputSchema = z.object({
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

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  logger.info(`Organizing email: ${input.messageId}`)

  try {
    const googleService = new GoogleService(logger, state);
    const {labelsToApply, labelIds} = await googleService.updateLabels(input);

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
