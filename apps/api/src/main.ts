import { createApp } from "./app";

async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT || 3001), "127.0.0.1");
}

bootstrap().catch((error) => {
  console.error("Could not start Luma API:", error);
  process.exitCode = 1;
});
