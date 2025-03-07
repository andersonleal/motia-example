import { FlowContext, Logger } from "@motiadev/core";
import { IEmail, ParseGmailApi } from 'gmail-api-parse-message-ts';

import { google } from "googleapis";
import { GoogleBaseService } from "./google-base.service";
// Keep the Email type for backward compatibility or internal use
type Email = {
  category: {
    category: string;
  };
  urgency: {
    urgency: string;
  };
  importance: {
    importance: string;
  };
  messageId: string;
  subject: string;
  from: string;
  threadId: string;
};

export type EmailResponse = {
  subject: string;
  from: string;
  messageId: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  category?: {
    category: string;
    confidence: number;
    alternative?: string | null;
    promotion_score?: number | null;
  };
  urgency?: {
    urgency: string;
    score: number;
    factors?: Record<string, number>;
  };
  importance?: {
    importance: string;
    score: number;
    factors?: Record<string, number>;
  };
  shouldArchive?: boolean;
}

type Category = 'work' | 'personal' | 'spam' | 'promotional' | 'social' | 'other' | 'unknown';
type Urgency = 'high' | 'medium' | 'low';
type Importance = 'high' | 'medium' | 'low';

export class GoogleService extends GoogleBaseService {
  private readonly autoResponderName = 'Anderson Leal';
  private readonly  labelMappings: Record<Category, string> = {
    work: 'Work',
    personal: 'Personal',
    spam: 'Spam',
    unknown: 'Unknown',
    promotional: 'Promotional',
    social: 'Social',
    other: 'Other'
  }

  private readonly  urgencyLabels: Record<Urgency, string> = {
    high: 'Urgent',
    medium: 'Normal',
    low: 'Low-Priority'
  }

  private labelsToApply: string[] = [];
  private labelIds: string[] = [];

  constructor(logger: Logger, state: FlowContext['state']) {
    super(logger, state)
  }

  async processLabel(labelName: string): Promise<void> {
    const label = await this.findOrCreateLabel(labelName);

    this.logger.info(`Label ${labelName} created: ${label.id}`);

    if (label.id) {
      this.labelIds.push(label.id);
      this.labelsToApply.push(labelName);
    }
  }

  // Helper function to determine category from EmailResponse
  private determineCategory(email: EmailResponse): Category {
    // Check labelIds first
    if (email.labelIds) {
      if (email.labelIds.some(id => id.toLowerCase().includes('work'))) return 'work';
      if (email.labelIds.some(id => id.toLowerCase().includes('personal'))) return 'personal';
      if (email.labelIds.some(id => id.toLowerCase().includes('social'))) return 'social';
      if (email.labelIds.some(id => id.toLowerCase().includes('promotions'))) return 'promotional';
      if (email.labelIds.some(id => id.toLowerCase().includes('spam'))) return 'spam';
    }
    
    // Check subject and snippet
    const contentToCheck = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (/work|task|project|deadline|meeting|presentation/i.test(contentToCheck)) return 'work';
    if (/personal|family|friend|vacation|holiday/i.test(contentToCheck)) return 'personal';
    if (/social|event|party|gathering|meetup/i.test(contentToCheck)) return 'social';
    if (/deal|discount|offer|subscription|newsletter|unsubscribe/i.test(contentToCheck)) return 'promotional';
    
    // Default
    return 'unknown';
  }

  // Helper function to determine urgency from EmailResponse
  private determineUrgency(email: EmailResponse): Urgency {
    const contentToCheck = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (/urgent|asap|emergency|immediately|deadline|today/i.test(contentToCheck)) return 'high';
    if (/important|priority|attention|soon/i.test(contentToCheck)) return 'medium';
    
    // Default
    return 'low';
  }

  // Helper function to determine importance from EmailResponse
  private determineImportance(email: EmailResponse): Importance {
    const contentToCheck = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (/important|critical|essential|key|crucial/i.test(contentToCheck)) return 'high';
    if (/significant|noteworthy|relevant/i.test(contentToCheck)) return 'medium';
    
    // Default
    return 'low';
  }

  async updateLabels(input: EmailResponse) {
    this.labelsToApply = [];
    this.labelIds = [];

    // Use the analyzed category if available, otherwise determine it ourselves
    let category: Category;
    if (input.category && input.category.category) {
      // Extract main category from the detailed category (e.g., "promotion.marketing" -> "promotional")
      const categoryParts = input.category.category.split('.');
      const mainCategory = categoryParts[0];
      
      // Map the main category to our Category type
      if (mainCategory === 'work') category = 'work';
      else if (mainCategory === 'personal') category = 'personal';
      else if (mainCategory === 'social') category = 'social';
      else if (mainCategory === 'promotion') category = 'promotional';
      else if (mainCategory === 'spam') category = 'spam';
      else if (mainCategory === 'update') category = 'other';
      else category = 'unknown';
      
      // Also add a subcategory label for more detailed organization if applicable
      if (categoryParts.length > 1 && categoryParts[1]) {
        const subCategory = categoryParts[1];
        const subCategoryLabel = `${this.labelMappings[category]}-${subCategory.charAt(0).toUpperCase() + subCategory.slice(1)}`;
        await this.processLabel(subCategoryLabel);
      }
    } else {
      category = this.determineCategory(input);
    }

    // Apply the main category label
    const categoryLabel = this.labelMappings[category];
    if (categoryLabel) {
      await this.processLabel(categoryLabel);
    }

    // Apply urgency label if available
    let urgency: Urgency = 'medium';
    if (input.urgency && input.urgency.urgency) {
      if (input.urgency.urgency === 'high') urgency = 'high';
      else if (input.urgency.urgency === 'medium') urgency = 'medium';
      else urgency = 'low';
    } else {
      urgency = this.determineUrgency(input);
    }
    
    const urgencyLabel = this.urgencyLabels[urgency];
    if (urgencyLabel) {
      await this.processLabel(urgencyLabel);
    }

    return {
      labelsToApply: this.labelsToApply,
      labelIds: this.labelIds
    }
  }

  private generateResponse(email: EmailResponse) {
    let response = '';

    const category = this.determineCategory(email);
    const urgency = this.determineUrgency(email);
    const importance = this.determineImportance(email);
    
    const [mainCategory, subCategory] = category.split('.');
    const isUrgent = urgency === 'high';
    const isImportant = importance === 'high';

    switch (mainCategory) {
      case 'work':
        if (subCategory === 'task') {
          if (isUrgent) {
            response = `Hi,\n\nThank you for assigning me this task. I've noted this as urgent and will work on it as soon as possible.\n\nRegards, ${this.autoResponderName}`;
          } else {
            response = `Hi,\n\nThank you for assigning me this task. I'll review it and get back to you with updates.\n\nRegards, ${this.autoResponderName}`;
          }
        } else if (subCategory === 'meeting') {
          response = `Hi,\n\nThank you for the meeting invitation. I've received it and will confirm my availability shortly.\n\nRegards, ${this.autoResponderName}`;
        } else if (subCategory === 'update') {
          response = `Hi,\n\nThank you for the update. I've noted the information and will review it in detail.\n\nRegards, ${this.autoResponderName}`;
        } else {
          // General work-related response
          if (isUrgent) {
            response = `Hi,\n\nThank you for your work-related email. I've noted this as urgent and will address it as soon as possible.\n\nRegards, ${this.autoResponderName}`;
          } else {
            response = `Hi,\n\nThank you for your work-related email. I'll review it and get back to you soon.\n\nRegards, ${this.autoResponderName}`;
          }
        }
        break;

      case 'personal':
        if (subCategory === 'finance') {
          response = `Hi,\n\nThank you for your message regarding financial matters. I'll read it carefully and respond when I can.\n\nBest, ${this.autoResponderName}`;
        } else if (subCategory === 'health') {
          response = `Hi,\n\nThank you for your health-related message. I'll give this my attention as soon as possible.\n\nBest, ${this.autoResponderName}`;
        } else if (subCategory === 'family') {
          response = `Hi,\n\nThanks for your family-related message! I'll read it properly and get back to you.\n\nBest, ${this.autoResponderName}`;
        } else {
          // General personal response
          response = `Hi,\n\nThanks for your personal message! I'll read it properly and get back to you when I can.\n\nBest, ${this.autoResponderName}`;
        }
        break;

      case 'social':
        if (subCategory === 'event') {
          response = `Hi,\n\nThanks for the event information! I'll check my schedule and let you know.\n\nBest, ${this.autoResponderName}`;
        } else if (subCategory === 'networking') {
          response = `Hi,\n\nI appreciate you reaching out to connect. I'll review your message and respond soon.\n\nBest, ${this.autoResponderName}`;
        } else {
          // General social response
          response = `Thanks for the social update. I'll check it out soon! ${this.autoResponderName}`;
        }
        break;

      case 'promotion':
      case 'promotional':
        // No response needed for marketing/promotional emails
        return null;

      case 'update':
        if (subCategory === 'notification' && isImportant) {
          response = `Thank you for the important notification. I've received it and will take appropriate action.\n\nRegards, ${this.autoResponderName}`;
        } else {
          // No response needed for general updates and newsletters
          return null;
        }
        break;

      case 'spam':
        // No response for spam
        return null;

      default:
        response = `Hi,\n\nThank you for your email. I'll review it and respond appropriately.\n\nBest regards, ${this.autoResponderName}`;
    }

    return response;
  };


  async getEmail(historyId: string): Promise<EmailResponse> {
    const tokens = await this.getTokens()

    if (!tokens) {
      throw new Error('No tokens found')  
    }

    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded']
    });

    const historyRecord = history.data.history?.[0]?.messagesAdded?.[0];
    const messageId = historyRecord?.message?.id;
    if (!messageId) {
      this.logger.info('No new messages found.');
      throw new Error('No new messages found.');
    }

    const {data} = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const parse = new ParseGmailApi();
    const email : IEmail = parse.parseMessage(data);


    if(!email.subject) {
      this.logger.info(`No subject found for email ${messageId}`);
      throw new Error(`No subject found for email ${messageId}`);
    }
    
    return {
      subject: email.subject,
      from: email.from.email,
      messageId,
      threadId: email.threadId,
      snippet: email.snippet,
      labelIds: email.labelIds,
    };
  }

  async sendEmail(emailResponse: EmailResponse) {
    const responseText = this.generateResponse(emailResponse);

    if (!responseText) {
      const category = this.determineCategory(emailResponse);
      this.logger.info(`No auto-response generated for this email category ${category}`);
      throw new Error(`No auto-response generated for this email category ${category}`);
    }

    const {
      messageId,
      subject,
      from,
      threadId,
    } = emailResponse

    this.logger.info(`Sending email ${messageId} to ${from} with subject ${subject} and threadId ${threadId} and responseText ${responseText}`)
  }

  async modifyMessage(messageId: string, labelIds: string[]) {

    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: labelIds
      }
    });
  }

  async archiveMessage(messageId: string, archiveLabelId: string) {
    this.logger.info(`Archiving message ${messageId} with archive label ${archiveLabelId}`);
    
    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
        addLabelIds: [archiveLabelId]
      }
    });

    return {
      messageId,
      archived: true,
      archiveLabelId
    };
  }

  async findOrCreateLabel(labelName: string) {
    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    const labelList = await gmail.users.labels.list({userId: 'me'});

    const label = labelList.data.labels?.find(l => l.name === labelName);

    if (label) {
      return label;
    }

    const newLabel = await gmail.users.labels.create({userId: 'me', requestBody: {name: labelName}});

    return {
      id: newLabel.data.id,
      name: newLabel.data.name
    }
  }
}
