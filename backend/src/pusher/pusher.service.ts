import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Pusher = require('pusher');

@Injectable()
export class PusherService {
  private pusher: any = null;
  private readonly logger = new Logger(PusherService.name);

  constructor(private configService: ConfigService) {
    const appId = this.configService.get<string>('PUSHER_APP_ID');
    const key = this.configService.get<string>('PUSHER_KEY');
    const secret = this.configService.get<string>('PUSHER_SECRET');
    const cluster = this.configService.get<string>('PUSHER_CLUSTER');

    if (appId && key && secret && cluster) {
      this.pusher = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
      this.logger.log(`Pusher initialized for cluster ${cluster}`);
    } else {
      this.logger.warn('Pusher credentials not found in env. Real-time events will not be sent.');
    }
  }

  async triggerEvent(channel: string, event: string, data: any) {
    if (!this.pusher) {
      this.logger.debug(`Pusher mock: event ${event} on channel ${channel} triggered.`);
      return;
    }
    try {
      await this.pusher.trigger(channel, event, data);
    } catch (error: any) {
      this.logger.error(`Error triggering Pusher event on channel ${channel}: ${error.message}`);
    }
  }
}
