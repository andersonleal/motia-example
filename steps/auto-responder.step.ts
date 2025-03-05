import {EventConfig, StepHandler} from 'motia';
import { GoogleService } from '../services/google.service';
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

const autoResponderName = 'Anderson Leal';

const generateResponse = (email: z.infer<typeof categorizedEmailSchema>) => {
  let response = '';
  
  const [mainCategory, subCategory] = email.category.category.split('.');
  const isUrgent = email.urgency.urgency === 'high';
  const isImportant = email.importance.importance === 'high';

  switch (mainCategory) {
    case 'work':
      if (subCategory === 'task') {
        if (isUrgent) {
          response = `Hi,\n\nThank you for assigning me this task. I've noted this as urgent and will work on it as soon as possible.\n\nRegards, ${autoResponderName}`;
        } else {
          response = `Hi,\n\nThank you for assigning me this task. I'll review it and get back to you with updates.\n\nRegards, ${autoResponderName}`;
        }
      } else if (subCategory === 'meeting') {
        response = `Hi,\n\nThank you for the meeting invitation. I've received it and will confirm my availability shortly.\n\nRegards, ${autoResponderName}`;
      } else if (subCategory === 'update') {
        response = `Hi,\n\nThank you for the update. I've noted the information and will review it in detail.\n\nRegards, ${autoResponderName}`;
      } else {
        // General work-related response
        if (isUrgent) {
          response = `Hi,\n\nThank you for your work-related email. I've noted this as urgent and will address it as soon as possible.\n\nRegards, ${autoResponderName}`;
        } else {
          response = `Hi,\n\nThank you for your work-related email. I'll review it and get back to you soon.\n\nRegards, ${autoResponderName}`;
        }
      }
      break;

    case 'personal':
      if (subCategory === 'finance') {
        response = `Hi,\n\nThank you for your message regarding financial matters. I'll read it carefully and respond when I can.\n\nBest, ${autoResponderName}`;
      } else if (subCategory === 'health') {
        response = `Hi,\n\nThank you for your health-related message. I'll give this my attention as soon as possible.\n\nBest, ${autoResponderName}`;
      } else if (subCategory === 'family') {
        response = `Hi,\n\nThanks for your family-related message! I'll read it properly and get back to you.\n\nBest, ${autoResponderName}`;
      } else {
        // General personal response
        response = `Hi,\n\nThanks for your personal message! I'll read it properly and get back to you when I can.\n\nBest, ${autoResponderName}`;
      }
      break;

    case 'social':
      if (subCategory === 'event') {
        response = `Hi,\n\nThanks for the event information! I'll check my schedule and let you know.\n\nBest, ${autoResponderName}`;
      } else if (subCategory === 'networking') {
        response = `Hi,\n\nI appreciate you reaching out to connect. I'll review your message and respond soon.\n\nBest, ${autoResponderName}`;
      } else {
        // General social response
        response = `Thanks for the social update. I'll check it out soon! ${autoResponderName}`;
      }
      break;

    case 'promotion':
      // No response needed for marketing/promotional emails
      return null;

    case 'update':
      if (subCategory === 'notification' && isImportant) {
        response = `Thank you for the important notification. I've received it and will take appropriate action.\n\nRegards, ${autoResponderName}`;
      } else {
        // No response needed for general updates and newsletters
        return null;
      }
      break;

    case 'spam':
      // No response for spam
      return null;

    default:
      response = `Hi,\n\nThank you for your email. I'll review it and respond appropriately.\n\nBest regards, ${autoResponderName}`;
  }

  return response;
};

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  try {
    const responseText = generateResponse(input);

    if (!responseText) {
      logger.info(`No auto-response generated for this email category ${input.category}`);
      return;
    }

    const googleService = new GoogleService(logger);
    await googleService.sendEmail({
      messageId: input.messageId,
      subject: input.subject,
      from: input.from,
      threadId: input.threadId,
      responseText
    });

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