import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { z } from 'zod';
import Logger from '../utils/logger';

const chatMessageSchema = z.object({
    text: z.string().trim().max(4000).default(''),
    attachmentUrl: z.string().trim().url().optional(),
    contextAttachmentUrl: z.string().trim().url().optional(),
    history: z.array(
        z.object({
            sender: z.enum(['user', 'bot']).optional(),
            text: z.string().trim().max(4000).optional(),
            type: z.string().trim().max(100).optional(),
        })
    ).max(20).optional(),
});

export const chatController = {
    async handleMessage(req: Request, res: Response) {
        try {
            const { text, attachmentUrl, contextAttachmentUrl, history } = chatMessageSchema.parse(req.body ?? {});
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            if (!text && !attachmentUrl && !contextAttachmentUrl) {
                res.status(400).json({ error: 'Message text or attachment is required' });
                return;
            }

            const response = await chatService.processMessage(userId, text, attachmentUrl, contextAttachmentUrl, history || []);
            res.json(response);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Invalid chat payload', details: error.issues });
                return;
            }

            Logger.error(`Chat error: ${error?.message || 'unknown error'}`);
            res.status(500).json({ error: 'Failed to process message' });
        }
    }
};
