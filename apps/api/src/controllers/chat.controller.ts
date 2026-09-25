import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { HttpStatus } from '../constants';

export class ChatController {
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const messages = await chatService.getMessagesByOrder(orderId);
      sendSuccess(res, messages, 'Chat messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { orderId } = req.params;
      const { text, role = 'STORE' } = req.body;
      const message = await chatService.sendMessage(
        orderId,
        {
          id: req.user.id,
          name: req.user.name,
          role,
        },
        text
      );
      sendSuccess(res, message, 'Message sent successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getActiveThreads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.query as { restaurantId?: string };
      const threads = await chatService.getActiveThreads(restaurantId);
      sendSuccess(res, threads, 'Active chat threads retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
