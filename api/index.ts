import { createApp } from "../server/app";

const { app } = await createApp({ serveClient: false });

export default app;
