import {ApiRouteConfig, StepHandler} from '@motiadev/core';
import {z} from 'zod';

const emailSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Gmail Monitor',
  description: 'Receives webhook notifications from Gmail for new emails',
  path: '/api/gmail-webhook',
  method: 'POST',
  emits: ['gmail.email.received'],
  virtualSubscribes: ['api.gmail.webhook'],
  bodySchema: emailSchema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (req, {logger, emit}) => {
  const {messageId, threadId} = emailSchema.parse(req.body)
  logger.info(`Received email notification: ${messageId}`)

  await emit({
    topic: 'gmail.email.received',
    data: {messageId, threadId}
  })

  return {
    status: 200,
    body: {
      message: 'Email notification received and processing initiated'
    },
  }
} 