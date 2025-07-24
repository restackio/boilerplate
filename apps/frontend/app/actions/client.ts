import Restack from "@restackio/ai";

const connectionOptions = {
  engineId: process.env.RESTACK_ENGINE_ID,
  address: process.env.RESTACK_ENGINE_ADDRESS,
  apiKey: process.env.RESTACK_ENGINE_API_KEY,
};

export const client = new Restack(connectionOptions);

