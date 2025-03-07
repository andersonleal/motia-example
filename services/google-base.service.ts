import { FlowContext, Logger } from "@motiadev/core";
import { Credentials, OAuth2Client } from 'google-auth-library';

import { google } from "googleapis";
import { appConfig } from "../config/default";

export abstract class GoogleBaseService {
  protected logger: Logger
  protected state: FlowContext['state']
  protected readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly', 
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  constructor(logger: Logger, state: FlowContext['state']) {
    this.logger = logger
    this.state = state
  }

  protected async saveTokens(tokens: Credentials) {
    await this.state.set<Credentials>('gmail.auth', 'tokens', tokens)
  }

  async getTokens(): Promise<Credentials | null> {
    return this.state.get<Credentials>('gmail.auth', 'tokens')
  }

  protected async getAuth(): Promise<OAuth2Client> {
    const tokens = await this.getTokens()

    const client = new google.auth.OAuth2(
      appConfig.google.clientId,
      appConfig.google.clientSecret,
      appConfig.google.redirectUri
    );
    
    if (!tokens) {
      return client
    }

    client.setCredentials(tokens)

    return client
  }

  async fetchTokens(code: string): Promise<Credentials> {
    this.logger.info(`Getting tokens for code ${code}`)

    if (!code) {
      throw new Error('No code found')
    }

    const authClient = await this.getAuth()
    
    const { tokens } = await authClient.getToken(code);
    
    await this.saveTokens(tokens)

    return tokens
  }

  async watchEmail(): Promise<void> {
    const authClient = await this.getAuth()

    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const requestBody = {
      topicName: appConfig.google.topicName
    };

    await gmail.users.watch({ userId: 'me', requestBody });
  }

  async getAuthUrl(): Promise<string> {
    const authClient = await this.getAuth()
    
    return authClient.generateAuthUrl({
      scope: this.SCOPES,
      access_type: 'offline',
      include_granted_scopes: true
    })
  }
}
