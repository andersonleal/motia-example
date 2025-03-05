import { NoopConfig } from '@motiadev/core'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Gmail Webhook Simulator',
  description: 'This node is used to simulate a Gmail webhook.',
  virtualEmits: ['api.gmail.webhook'],
  virtualSubscribes: [],
  flows: ['gmail-flow'],
}
