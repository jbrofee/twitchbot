import fastify from 'fastify';
import { RefreshingAuthProvider } from "@twurple/auth";
import { Bot } from "@twurple/easy-bot";
import { fastifyEnv } from "@fastify/env";
import { promises as fs } from 'fs';

// Type declaration for fastify config
declare module 'fastify' {
    interface FastifyInstance {
        config: {
            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;
            access_token: string;
            refresh_token: string;
        };
    }
}

// Declaring server
const server = fastify();

// Importing environment variables
// Setting env schema
const envSchema = {
    type: 'object',
    required: [ 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'access_token', 'refresh_token'],
    properties: {
        TWITCH_CLIENT_ID: {
            type: 'string',
        },
        TWITCH_CLIENT_SECRET: {
            type: 'string',
        },
        access_token: {
            type: 'string',
        },
        refresh_token: {
            type: 'string',
        },
    }
}

// Options for env loading
const options = {
    dotenv: true,
    confKey: 'config',
    schema: envSchema
}

// Registering env plugin
// Using await as this is weirdly slow
await server.register(fastifyEnv, options)
await server.after();

// Bot set up in line with: https://twurple.js.org/docs/examples/chat/basic-bot.html
// These are stored in env file; some aspects are in JSON file as they are regularly overwritten
const clientSecret = server.config.TWITCH_CLIENT_SECRET;
const clientId = server.config.TWITCH_CLIENT_ID;

// Grabbing data from JSON file
const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'utf-8'));
const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

// Updating refresh/access tokens
authProvider.onRefresh(async (newTokenData) => await fs.writeFile(`./tokens.json`, JSON.stringify(newTokenData, null, 4), 'utf-8'));

// Connecting to my chat
await authProvider.addUserForToken(tokenData, ['chat']);
const bot = new Bot({ authProvider, channels: ['jbrofee']});
bot.say("jbrofee", "Hello, I am a bot!");


// Basic ping check for debugging
server.get('/ping', async (request) => {
    console.log("Pinged", request.ip, request.url);
    return 'pong\n';
    })


// Starting the server and listing on port 3000
server.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
})
