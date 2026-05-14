"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    migrations: {
        seed: 'npx ts-node prisma/seed.ts',
    },
    datasource: {
        url: process.env.DATABASE_URL,
        ...(process.env.DIRECT_URL ? { directUrl: process.env.DIRECT_URL } : {}),
    },
});
//# sourceMappingURL=prisma.config.js.map