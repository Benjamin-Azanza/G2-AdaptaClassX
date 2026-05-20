"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
let cachedApp;
async function bootstrap() {
    if (!cachedApp) {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const frontendUrl = process.env.FRONTEND_URL;
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:3001'];
        if (frontendUrl)
            allowedOrigins.push(frontendUrl);
        app.enableCors({
            origin: allowedOrigins,
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        app.setGlobalPrefix('api');
        await app.init();
        cachedApp = app.getHttpAdapter().getInstance();
    }
    return cachedApp;
}
async function default_1(req, res) {
    const app = await bootstrap();
    app(req, res);
}
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    bootstrap().then((appInstance) => {
        const port = process.env.PORT ?? 3000;
        appInstance.listen(port, () => {
            console.log(`🚀 Backend running locally on http://localhost:${port}/api`);
        });
    });
}
//# sourceMappingURL=main.js.map