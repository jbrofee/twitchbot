// Fastify imports
import fastify from "fastify";
import { fastifyEnv } from "@fastify/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";

// Twurple imports
import { RefreshingAuthProvider } from "@twurple/auth";
import { Bot } from "@twurple/easy-bot";
import { ApiClient } from "@twurple/api";
import { EventSubWsListener } from "@twurple/eventsub-ws";

// Handlers
import {
  initializeClickHouse,
  clickhouseClient,
} from "./handlers/clickhouse.ts";
import chatMessageHandler from "./handlers/chat/chatMessage.ts";
import redemptionHandler from "./handlers/redemption/redemptionHandler.ts";

// External systems
import OpenAI from "openai";
import { OBSWebSocket } from "obs-websocket-js";

// Type declaration for fastify config
declare module "fastify" {
  interface FastifyInstance {
    config: {
      TWITCH_CLIENT_ID: string;
      TWITCH_CLIENT_SECRET: string;
      TWITCH_USER_ID: string;
      CLICKHOUSE_URI: string;
    };
  }
}

// TODO make all the below try/catch blocks with proper error handling
// Declaring server
const server = fastify();

// Importing environment variables
// Setting env schema
const envSchema = {
  type: "object",
  required: [
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET",
    "TWITCH_USER_ID",
    "CLICKHOUSE_URI",
  ],
  properties: {
    TWITCH_CLIENT_ID: {
      type: "string",
    },
    TWITCH_CLIENT_SECRET: {
      type: "string",
    },
    TWITCH_USER_ID: {
      type: "string",
    },
    CLICKHOUSE_URI: {
      type: "string",
    },
  },
};

// Options for env loading
const options = {
  dotenv: true,
  confKey: "config",
  schema: envSchema,
};

// Registering env and static file serving plugins
// Using await as this is weirdly slow
await server.register(fastifyEnv, options);
await server.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "overlay"),
  prefix: "/overlay",
});
await server.register(fastifyWebsocket);
await server.after();

// Initializning Clickhouse Client
const clickhouseUri = server.config.CLICKHOUSE_URI;
initializeClickHouse(clickhouseUri);

// Initializing OpenAI client for TTS
const openai = new OpenAI({
  apiKey: "not-needed",
  baseURL: "http://localhost:8880/v1",
});

// Connecting to OBS
// TODO maybe track scene changes? idk
const obs = new OBSWebSocket();
try {
  await obs.connect("ws://127.0.0.1:4455", "VuxJGKKyietIM7Vf");
} catch (error) {
  console.error("Couldn't connect to OBS.");
}

// Bot set up in line with: https://twurple.js.org/docs/examples/chat/basic-bot.html
// These are stored in env file; some aspects are in JSON file as they are regularly overwritten
const clientSecret = server.config.TWITCH_CLIENT_SECRET;
const clientId = server.config.TWITCH_CLIENT_ID;
const twitchUserId = server.config.TWITCH_USER_ID;

console.log("Checking in index: " + twitchUserId);

// Grabbing data from JSON file
const tokenData = JSON.parse(
  await fs.readFile(`./tokens.${twitchUserId}.json`, "utf-8")
);
const authProvider = new RefreshingAuthProvider({
  clientId,
  clientSecret,
  appImpliedScopes: [
    "chat:read",
    "channel:manage:redemptions",
    "channel:manage:ads",
    "channel:read:redemptions",
    "channel:read:ads",
    "channel:read:vips",
    "moderator:manage:banned_users",
    "moderator:read:banned_users",
    "moderator:manage:shoutouts",
    "channel:edit:commercial",
  ],
});

// Updating refresh/access tokens
authProvider.onRefresh(
  async (userId, newTokenData) =>
    await fs.writeFile(
      `./tokens.${userId}.json`,
      JSON.stringify(newTokenData, null, 4),
      "utf-8"
    )
);

// Getting user info and subscribing to events using Evensub/ws
await authProvider.addUserForToken(tokenData, [
  "chat",
  "channel:read:redemptions",
]);
const apiClient = new ApiClient({ authProvider });
const listener = new EventSubWsListener({ apiClient });

// Listener for channel point redemptions
const channelPointsListener = listener.onChannelRedemptionAdd(
  twitchUserId,
  (redemption) => {
    redemptionHandler(
      redemption,
      apiClient,
      twitchUserId,
      obs,
      clickhouseClient!
    );
  }
);

// New chat message handler which can ignore reward input text
const chatMessageListener = listener.onChannelChatMessage(
  twitchUserId,
  twitchUserId,
  (message) => {
    if (message.rewardId) {
      console.info(
        "[INFO]: Chat message was a channel point redemption, not processing in handler."
      );
    } else {
      console.log("Using listener: " + message);
    }
  }
);

// Starts the above listeners
listener.start();

// Creating basic bot
const bot = new Bot({ authProvider, channels: ["jbrofee"] });

// Chat message handler
bot.onMessage(async (message) => {
  await chatMessageHandler(message, openai);
});

bot.onJoin(async (message) => {
  console.log(`${message.userName} joined the chat`);
});

// Basic ping check for debugging
server.get("/ping", async (request) => {
  console.log("Pinged", request.ip, request.url);
  return "pong\n";
});

server.get("/websocket", { websocket: true }, (socket, req) => {
  console.log("Client connected " + req.id + req.id);
  socket.onmessage = (message) => {
    console.log(message.data);
  };
});

// Starting the server and listing on port 3000
server.listen({ port: 3001 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
