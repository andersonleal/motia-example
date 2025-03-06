import { Logger } from "@motiadev/core";
import { emailMessages } from "./mock.messages";

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

type Category = 'work' | 'personal' | 'spam' | 'promotional' | 'social' | 'other' | 'unknown';
type Urgency = 'high' | 'medium' | 'low';

export class GoogleService {
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

  constructor(private readonly logger: Logger) {
  }


  async processLabel(labelName: string): Promise<void> {
    const label = await this.findOrCreateLabel(labelName);

    this.logger.info(`Label ${labelName} created: ${label.id}`);

    if (label.id) {
      this.labelIds.push(label.id);
      this.labelsToApply.push(labelName);
    }
  }

  async updateLabels (input: Email) {
    this.labelsToApply = [];
    this.labelIds = [];

    const categoryValue = input.category.category as Category;
    const categoryLabel = this.labelMappings[categoryValue];
    if (categoryLabel) {
      await this.processLabel(categoryLabel);
    }

    const urgencyValue = input.urgency.urgency as Urgency;
    const urgencyLabel = this.urgencyLabels[urgencyValue];
    if (urgencyLabel) {
      await this.processLabel(urgencyLabel);
    }

    return {
      labelsToApply: this.labelsToApply,
      labelIds: this.labelIds
    }
  }

  private generateResponse(email: Email) {
    let response = '';

    const [mainCategory, subCategory] = email.category.category.split('.');
    const isUrgent = email.urgency.urgency === 'high';
    const isImportant = email.importance.importance === 'high';

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

  async getEmail(messageId: string) {
    return emailMessages[messageId] || {
      messageId,
      subject: 'Message Not Found',
      content: 'The requested message could not be found.',
      from: 'system@company.com',
      date: new Date().toISOString(),
    };
  }

  async sendEmail(email: Email) {
    const responseText = this.generateResponse(email);

    if (!responseText) {
      throw new Error(`No auto-response generated for this email category ${email.category}`);
    }

    const {
      messageId,
      subject,
      from,
      threadId,
    } = email

    this.logger.info(`Sending email ${messageId} to ${from} with subject ${subject} and threadId ${threadId} and responseText ${responseText}`)
  }

  async modifyMessage(messageId: string, labelIds: string[]) {
    return {
      messageId,
      labelIds
    }
  }

  async findOrCreateLabel(labelName: string) {
    return {
      id: '123',
      name: labelName
    }
  }
}
