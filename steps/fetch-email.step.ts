import {EventConfig, StepHandler} from 'motia'
import { EmailResponse, GoogleService } from '../services/google.service'
import {z} from 'zod'

const schema = z.object({
  messageId: z.string(),
  historyId: z.number(),
})

export const config: EventConfig<typeof schema> = {
  type: 'event',
  name: 'Gmail Email Fetcher',
  description: 'Fetches email content from Gmail when triggered by an email received event',
  subscribes: ['gmail.email.received'],
  emits: ['gmail.email.fetched'],
  input: schema,
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (input, {emit, logger, state}) => {
  try {
    const payload = schema.parse(input)

    logger.info(`Fetching email content: ${JSON.stringify(payload)}`)

    const {messageId, historyId} = payload
    const googleService = new GoogleService(logger, state);
    const data: EmailResponse = await googleService.getEmail(historyId.toString())

    logger.info(`Emitting fetched email: ${JSON.stringify(data.subject)}`)

    await emit({
      topic: 'gmail.email.fetched',
      data
    })

    logger.info(`Email fetch completed successfully: ${messageId}`)
  } catch (error) {
    logger.error(`Error fetching email content ${JSON.stringify(error)}`)
  }
}