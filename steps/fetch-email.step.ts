import {EventConfig, StepHandler} from 'motia'
import { GoogleService } from '../services/google.service'
import {z} from 'zod'

const inputSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
})

export const config: EventConfig<typeof inputSchema> = {
  type: 'event',
  name: 'Gmail Email Fetcher',
  description: 'Fetches email content from Gmail when triggered by an email received event',
  subscribes: ['gmail.email.received'],
  emits: ['gmail.email.fetched'],
  input: inputSchema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (payload, {emit, logger}) => {
  try {
    logger.info(`Fetching email content: ${JSON.stringify(payload)}`)

    const {messageId, threadId} = payload
    const googleService = new GoogleService(logger);
    const data = await googleService.getEmail(messageId)

    logger.info(`Emitting fetched email: ${JSON.stringify(data)}`)

    await emit({
      topic: 'gmail.email.fetched',
      data: {
        ...data,
        messageId,
        threadId
      }
    })

    logger.info(`Email fetch completed successfully: ${messageId}`)
  } catch (error) {
    // Handle errors properly
    logger.error('Error fetching email content', {
      messageId: payload.messageId,
      error: error instanceof Error ? error.message : String(error)
    })

    // Optionally emit an error event depending on your error handling strategy
    await emit({
      topic: 'gmail.email.fetchError',
      data: {
        messageId: payload.messageId,
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }
}