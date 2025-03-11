# Gmail Account Manager

An intelligent Gmail account manager built with the Motia framework. This workflow monitors incoming emails, analyzes them using Hugging Face's AI models, and automatically responds based on the content analysis.

## Features

- Email classification by category (work, personal, social, promotion, spam, update)
- Urgency detection (high, medium, low)
- Automated responses based on email context
- Email organization (labeling, archiving)
- Daily summary reports via Discord
- Gmail API integration with authentication flow
- Real-time email monitoring with webhook notifications

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
   - Hugging Face API token
   - Discord webhook URL
   - Gmail API credentials will be obtained through the authentication flow

## Gmail API Authentication

This project includes a complete OAuth2 authentication flow for the Gmail API:

1. Start the development server: `pnpm dev`
2. Navigate to the authentication workflow in the Motia Workbench
3. The workflow will generate an authorization URL
4. Open the URL in your browser and authorize the application
5. The application will receive and store your authentication tokens

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

### 1. Gmail Authentication (Multi-Step Flow)
- **Files**: 
  - `steps/gmail-get-auth-url.step.ts`: Generates OAuth2 authorization URL
  - `steps/gmail-auth.step.ts`: Handles authorization code exchange
  - `steps/gmail-token-status.step.ts`: Checks token validity and refreshes if needed

### 2. Gmail Webhook (API Step)
- **File**: `steps/gmail-webhook.step.ts`
- **Purpose**: Receives notifications from Gmail when new emails arrive
- **Emits**: `gmail.new_email` event with message details
- **Endpoint**: `POST /api/gmail-webhook`

### 3. Gmail Watch (API Step)
- **File**: `steps/gmail-watch.step.ts`
- **Purpose**: Sets up push notifications for the Gmail account
- **Endpoint**: `GET /api/watch`

### 4. Fetch Email (Event Step)
- **File**: `steps/fetch-email.step.ts`
- **Purpose**: Retrieves the full email content from Gmail API
- **Subscribes to**: `gmail.email.received`
- **Emits**: `gmail.email.fetched` with complete email data
- **Key Functions**: Authenticates with Gmail API, fetches message content, parses attachments

### 5. Analyze Email (Event Step)
- **File**: `steps/analyze-email.step.py`
- **Purpose**: Uses Hugging Face models to analyze email content
- **Subscribes to**: `gmail.email.fetched`
- **Emits**: `gmail.email.analyzed` with analysis results
- **Analysis Performed**: 
  - Category classification
  - Urgency detection
  - Sentiment analysis
  - Key information extraction

### 6. Organize Email (Event Step)
- **File**: `steps/organize-email.step.ts`
- **Purpose**: Applies labels and organization based on analysis
- **Subscribes to**: `gmail.email.analyzed`
- **Emits**: `[gmail.email.organized, gmail.email.archived]`
- **Actions**: Creates/applies labels, archives certain emails, marks importance

### 7. Auto-Respond to Email (Event Step)
- **File**: `steps/auto-responder.step.ts`
- **Purpose**: Generates and sends appropriate responses for certain emails
- **Subscribes to**: `gmail.email.analyzed`
- **Emits**: `gmail.email.responded`
- **Features**: 
  - Template selection based on email context
  - Personalization of responses
  - Auto-reply for urgent messages
  - Follow-up scheduling

### 8. Daily Summary (Cron Step)
- **File**: `steps/daily-summary.step.ts`
- **Purpose**: Compiles and sends daily email activity summary
- **Schedule**: Runs daily at 6:00 PM
- **Emits**: `gmail.summary.sent`
- **Delivery**: Sends report to Discord via webhook

## Testing

### Simulating Gmail Webhook

You can simulate a Gmail webhook event with this curl command:

```bash
curl -X POST http://localhost:3000/api/gmail-webhook -H "Content-Type: application/json" -d '{"message":{"data":"eyJlbWFpbEFkZHJlc3MiOiJhbmRlcnNvbm9mbEBnbWFpbC5jb20iLCJoaXN0b3J5SWQiOjI4NTUyNjgyfQ==","messageId":"13594882889976308","publishTime":"2025-03-10T23:30:09.266Z"},"subscription":"projects/xxxx/subscriptions/xxxxx"}'
```

## Project Structure

- `steps/` - Contains all workflow steps
  - `gmail-get-auth-url.step.ts` - Generates OAuth2 URL
  - `gmail-auth.step.ts` - Handles OAuth2 flow
  - `gmail-token-status.step.ts` - Manages token refresh
  - `gmail-webhook.step.ts` - Webhook endpoint for Gmail notifications
  - `gmail-watch.step.ts` - Sets up Gmail push notifications
  - `fetch-email.step.ts` - Fetches email content from Gmail API
  - `analyze-email.step.py` - Python step for email analysis using Hugging Face
  - `organize-email.step.ts` - Organizes emails (labels, archives)
  - `auto-responder.step.ts` - Generates appropriate responses
  - `daily-summary.step.ts` - Sends daily summary to Discord
- `services/` - Shared service modules
- `config/` - Configuration files
- `.motia/` - Motia framework configuration

## Dependencies

### Node.js Dependencies
- @motiadev/core, @motiadev/workbench, motia: Motia framework
- googleapis, google-auth-library: Google API integration
- gmail-api-parse-message-ts: Gmail message parsing
- axios: HTTP client
- zod: Schema validation
- react: UI components

### Python Dependencies
- transformers, torch: Machine learning models
- scikit-learn, numpy, pandas: Data processing
- huggingface_hub: Access to Hugging Face models
- python-dotenv: Environment variable loading

## Troubleshooting

- **Python Module Errors**: Ensure you've installed all required Python packages with `pip install -r requirements.txt`
- **Authentication Errors**: Verify your API credentials and follow the authentication flow
- **Webhook Issues**: Make sure the webhook endpoint is publicly accessible or properly configured for testing
- **Token Refresh Errors**: Check that your OAuth tokens are valid and that the refresh flow is working properly 