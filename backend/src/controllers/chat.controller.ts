import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';

export const chatController = {
    async handleMessage(req: Request, res: Response) {
        try {
            const { text } = req.body;
            // Assuming auth middleware populates req.user. If not, we might need a fallback or ensure auth is used.
            // For now, let's assume req.user is populated by the auth middleware we observed in other files.
            // If strictly typed, we might need to cast or ensure types.
            const userId = (req as any).user?.id;

            if (!userId) {
                // If not authenticated, we can't fetch personalized data
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const response = await chatService.processMessage(userId, text);
            res.json(response);
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    }
};
