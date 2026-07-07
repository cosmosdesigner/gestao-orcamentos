import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" });
  app.use(json({ limit: "8mb" }));
  await app.listen(Number(process.env.PORT ?? 3333));
}

void bootstrap();
