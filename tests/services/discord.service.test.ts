import axios from 'axios';
import { DiscordService, EmailSummary } from '../../services/discord.service';
import { Logger } from 'motia';

// Mock axios
jest.mock('axios');
const mockAxiosCreate = jest.fn();
const mockPost = jest.fn();
(axios.create as jest.Mock).mockReturnValue({ post: mockPost });

describe('DiscordService', () => {
  let discordService: DiscordService;
  let mockLogger: Logger;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPost.mockReset();
    
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      child: jest.fn(),
      isVerbose: false
    } as unknown as Logger;
    
    // Reset environment variables
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.webhook.url';
    
    // Create service instance
    discordService = new DiscordService(mockLogger);
  });
  
  describe('send', () => {
    it('should successfully send a summary to Discord', async () => {
      // Arrange
      const summary: EmailSummary = {
        totalEmails: 10,
        categoryCounts: { Work: 3, Personal: 2 },
        urgencyCounts: { High: 1, Medium: 4 },
        autoRespondedCount: 2
      };
      
      mockPost.mockResolvedValueOnce({ status: 200 });
      
      // Act
      await discordService.send(summary);
      
      // Assert
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('', expect.objectContaining({
        embeds: [expect.objectContaining({
          title: '📧 Daily Email Summary',
          description: expect.stringContaining('Summary of emails processed'),
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: '📊 Total Emails',
              value: '10 emails processed'
            }),
            expect.objectContaining({
              name: '🏷️ Categories',
              value: 'Work: 3\nPersonal: 2'
            }),
            expect.objectContaining({
              name: '🚨 Urgency',
              value: 'High: 1\nMedium: 4'
            }),
            expect.objectContaining({
              name: '🤖 Auto-responded',
              value: '2 emails'
            })
          ])
        })]
      }));
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully sent daily summary to Discord');
    });
    
    it('should log an error when webhook URL is not configured', async () => {
      // Arrange
      process.env.DISCORD_WEBHOOK_URL = '';
      const summary: EmailSummary = {
        totalEmails: 5,
        categoryCounts: {},
        urgencyCounts: {},
        autoRespondedCount: 0
      };
      
      // Act
      await discordService.send(summary);
      
      // Assert
      expect(mockPost).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Discord webhook URL not configured');
    });
    
    it('should handle errors when sending fails', async () => {
      // Arrange
      const summary: EmailSummary = {
        totalEmails: 5,
        categoryCounts: {},
        urgencyCounts: {},
        autoRespondedCount: 0
      };
      
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      
      // Act
      await discordService.send(summary);
      
      // Assert
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send summary to Discord: Network error');
    });
    
    it('should format category and urgency counts correctly', async () => {
      // Arrange
      const summary: EmailSummary = {
        totalEmails: 5,
        categoryCounts: { Work: 3, Personal: 2 },
        urgencyCounts: { High: 1, Medium: 4 },
        autoRespondedCount: 0
      };
      
      mockPost.mockResolvedValueOnce({ status: 200 });
      
      // Act
      await discordService.send(summary);
      
      // Assert
      expect(mockPost).toHaveBeenCalledWith('', expect.objectContaining({
        embeds: [expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: '🏷️ Categories',
              value: 'Work: 3\nPersonal: 2'
            }),
            expect.objectContaining({
              name: '🚨 Urgency',
              value: 'High: 1\nMedium: 4'
            })
          ])
        })]
      }));
    });
    
    it('should handle empty category and urgency counts', async () => {
      // Arrange
      const summary: EmailSummary = {
        totalEmails: 5,
        categoryCounts: {},
        urgencyCounts: {},
        autoRespondedCount: 0
      };
      
      mockPost.mockResolvedValueOnce({ status: 200 });
      
      // Act
      await discordService.send(summary);
      
      // Assert
      expect(mockPost).toHaveBeenCalledWith('', expect.objectContaining({
        embeds: [expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: '🏷️ Categories',
              value: 'None'
            }),
            expect.objectContaining({
              name: '🚨 Urgency',
              value: 'None'
            })
          ])
        })]
      }));
    });
  });
}); 