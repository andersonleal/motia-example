export const appConfig = {
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  },
  google: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
  }
}
  