import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma Configuration
 * 
 * In Prisma v6, this file is optional — the schema.prisma handles the url.
 * Keeping this file for forward compatibility.
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
});
