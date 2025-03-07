import {NoopConfig} from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Google Auth',
  description: 'Fetches tokens from Google',
  virtualSubscribes: ['gmail.auth', 'gmail.auth-url'],
  virtualEmits: ['gmail.auth'],
  flows: ['gmail-flow'],
} 
