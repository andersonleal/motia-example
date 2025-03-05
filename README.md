# Gmail Account Manager

An intelligent Gmail account manager built with the Motia framework. This workflow monitors incoming emails, analyzes them using Hugging Face's AI models, and automatically responds based on the content analysis.

## Features

- Email classification by category (work, personal, social, promotion, spam, update)
- Urgency detection (high, medium, low)
- Automated responses based on email context
- Email organization (labeling, archiving)
- Daily summary reports via Discord

## Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- Gmail API credentials
- Hugging Face API token
- Discord webhook URL (for daily summaries)

## Setup

1. Clone this repository
2. Install Node.js dependencies:
   ```bash
   pnpm install
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
5. Edit the `.env` file with your credentials:
   - Gmail API credentials
   - Hugging Face API token
   - Discord webhook URL

## Discord Webhook Configuration

To receive daily email summaries in Discord, follow these steps to set up a webhook:

1. **Create a Discord Server** (skip if you already have one):
   - Open Discord and click the "+" icon on the left sidebar
   - Select "Create My Own" and follow the setup wizard

2. **Create a Channel for Notifications**:
   - Right-click on your server name and select "Server Settings"
   - Go to "Channels" and click "Create Channel"
   - Name it (e.g., "email-summaries") and click "Create"

3. **Create a Webhook**:
   - Right-click on your new channel and select "Edit Channel"
   - Go to "Integrations" tab
   - Click "Create Webhook"
   - Give it a name (e.g., "Gmail Summary Bot")
   - Optionally, customize the avatar
   - Click "Copy Webhook URL"

4. **Add Webhook URL to Environment Variables**:
   - Open your `.env` file
   - Add or update the Discord webhook URL:
     ```
     DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
     ```

5. **Test the Webhook**:
   - You can test if your webhook is working correctly with this curl command:
     ```bash
     curl -X POST -H "Content-Type: application/json" \
     -d '{"content": "Testing Gmail Account Manager webhook"}' \
     https://discord.com/api/webhooks/your-webhook-url
     ```
   - You should see the message appear in your Discord channel

## Running the Project

Start the development server:

```bash
pnpm dev
```

This will start the Motia server on http://localhost:3000. You can access the Workbench UI to interact with the workflow.

## Workflow Steps

The Gmail Account Manager workflow consists of the following steps:

### 1. Gmail Webhook (API Step)
- **File**: `steps/gmail-webhook.step.ts`
- **Purpose**: Receives notifications from Gmail when new emails arrive
- **Emits**: `gmail.new_email` event with message details
- **Endpoint**: `POST /api/gmail-webhook`

### 2. Fetch Email (Event Step)
- **File**: `steps/fetch-email.step.ts`
- **Purpose**: Retrieves the full email content from Gmail API
- **Subscribes to**: `gmail.new_email`
- **Emits**: `gmail.email_fetched` with complete email data
- **Key Functions**: Authenticates with Gmail API, fetches message content, parses attachments

### 3. Analyze Email (Event Step)
- **File**: `steps/analyze-email.step.py`
- **Purpose**: Uses Hugging Face models to analyze email content
- **Subscribes to**: `gmail.email_fetched`
- **Emits**: `gmail.email_analyzed` with analysis results
- **Analysis Performed**: 
  - Category classification
  - Urgency detection
  - Sentiment analysis
  - Key information extraction

### 4. Organize Email (Event Step)
- **File**: `steps/organize-email.step.ts`
- **Purpose**: Applies labels and organization based on analysis
- **Subscribes to**: `gmail.email_analyzed`
- **Emits**: `gmail.email_organized`
- **Actions**: Creates/applies labels, archives certain emails, marks importance

### 5. Respond to Email (Event Step)
- **File**: `steps/respond-to-email.step.ts`
- **Purpose**: Generates and sends appropriate responses for certain emails
- **Subscribes to**: `gmail.email_analyzed`
- **Emits**: `gmail.email_responded`
- **Features**: 
  - Template selection based on email context
  - Personalization of responses
  - Auto-reply for urgent messages
  - Follow-up scheduling

### 6. Daily Summary (Cron Step)
- **File**: `steps/daily-summary.step.ts`
- **Purpose**: Compiles and sends daily email activity summary
- **Schedule**: Runs daily at 6:00 PM
- **Emits**: `gmail.summary_sent`
- **Delivery**: Sends report to Discord via webhook

## Testing

### Simulating Gmail Webhook

You can simulate a Gmail webhook event with this curl command:

```bash
curl -X POST http://localhost:3000/api/gmail-webhook -H "Content-Type: application/json" -d '{"messageId": "123abc", "threadId": "thread123", "historyId": "hist123"}'
```

### Verifying the Flow

1. Check the Motia Workbench console for logs
2. Verify that email analysis is working correctly
3. Confirm auto-responses are generated for appropriate emails
4. Check your Discord channel for daily summaries (at 6 PM)

## Project Structure

- `steps/analyze-email.step.py`: Python step for email analysis using Hugging Face
- `steps/respond-to-email.step.ts`: TypeScript step for generating appropriate responses
- `steps/fetch-email.step.ts`: Fetches email content from Gmail API
- `steps/gmail-webhook.step.ts`: Webhook endpoint for Gmail notifications
- `steps/organize-email.step.ts`: Organizes emails (labels, archives)
- `steps/daily-summary.step.ts`: Sends daily summary to Discord

## Troubleshooting

- **Python Module Errors**: Ensure you've installed all required Python packages with `pip install -r requirements.txt`
- **Authentication Errors**: Verify your API credentials in the `.env` file
- **Webhook Issues**: Make sure the webhook endpoint is publicly accessible or properly configured for testing 