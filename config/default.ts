export const appConfig = {
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    topicName: process.env.GOOGLE_PUBSUB_TOPIC
  },
  autoResponder: {
    name: process.env.AUTO_RESPONDER_NAME,
    email: process.env.AUTO_RESPONDER_EMAIL
  }
}
  