import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend
    const frontendUrl = process.env.FRONTEND_URL;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3001'];
    if (frontendUrl) allowedOrigins.push(frontendUrl);

    app.enableCors({
      origin: allowedOrigins,
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
    appInstance.listen(port, () => {
      console.log(`🚀 Backend running locally on http://localhost:${port}/api`);
    });
  });
}
