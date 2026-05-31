import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend (allows local IP addresses and development ports)
    app.enableCors({
      origin: true,
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  return cachedApp;
}

// Vercel Serverless Function export
export default async function (req: any, res: any) {
  const app = await bootstrap();
  app(req, res);
}

// Local dev execution
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrap().then((appInstance: any) => {
    const port = process.env.PORT ?? 3000;
    appInstance.listen(Number(port), '0.0.0.0', () => {
      console.log(`🚀 Backend running locally on http://0.0.0.0:${port}/api`);
    });
  });
}
