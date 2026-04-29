import { createApp } from "./app";
import { log } from "./log";

const { server } = await createApp({ serveClient: true });

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(
  {
    port,
    host: "localhost",
  },
  () => {
    log(`serving on port ${port}`);
  },
);
