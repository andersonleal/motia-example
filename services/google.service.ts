import { Logger } from "@motiadev/core";
import { emailMessages } from "./mock.messages";

export class GoogleService {
  constructor(private readonly logger: Logger) {  }
  
  async getEmail(messageId: string) {
    return emailMessages[messageId] || {
      messageId,
      subject: 'Message Not Found',
      content: 'The requested message could not be found.',
      from: 'system@company.com',
      date: new Date().toISOString(),
    };
  }

  async sendEmail({
                    messageId,
                    subject,
                    from,
                    threadId,
                    responseText
                  }: {
    messageId: string;
    subject: string;
    from: string;
    threadId: string;
    responseText: string;
  }) {
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
