import { FlowContext, Logger } from "@motiadev/core";
import { IEmail, ParseGmailApi } from 'gmail-api-parse-message-ts';

import { google } from "googleapis";
import { GoogleBaseService } from "./google-base.service";
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
}

type Category = 'work' | 'personal' | 'spam' | 'promotional' | 'social' | 'other' | 'unknown';
type Urgency = 'high' | 'medium' | 'low';

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

  async sendEmail(email: Email) {
    const responseText = this.generateResponse(email);

    if (!responseText) {
      this.logger.info(`No auto-response generated for this email category ${email.category}`);
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
