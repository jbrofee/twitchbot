import type { MessageEvent } from "@twurple/easy-bot";
import { clickhouseClient } from "../clickhouse.ts";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import type { EventSubChannelChatMessageEvent } from "@twurple/eventsub-base";

interface ttsMessage {
  mode: string;
  url: string;
}

const VIP_LIST: Record<string, string> = {
  septten: "af_aoede",
  lanzsdiff: "am_adam",
  simpletoon: "am_michael",
  oneclumsybat: "af_nova",
  roystton: "am_liam",
  black_tomcat: "am_onyx",
  probakis: "am_echo",
  jbrofee: "pm_alex",
  daintyxmagician: "em_santa",
};

export default async function chatMessageHandler(
  message: EventSubChannelChatMessageEvent,
  openai: OpenAI,
  overlayWebSocket: WebSocket
) {
  let fileName;
  let ttsCount = 0;
  const USER_NAME = message.chatterDisplayName.toLowerCase();
  if (VIP_LIST[USER_NAME] != null) {
    console.log("Pinged");
    // Try to generate TTS, but don't block sending the follow event if it fails
    try {
      fileName = USER_NAME + Date.now() + ".mp3";
      const speechFile = path.resolve("./overlay/snippets/" + fileName);
      const inputStream = await openai.audio.speech.create({
        model: "kokoro",
        input: message.messageText,
        voice: VIP_LIST[USER_NAME],
      });
      const buffer = Buffer.from(await inputStream.arrayBuffer());
      await fs.promises.writeFile(speechFile, buffer);
      const payload: ttsMessage = {
        mode: "tts",
        url: `http://localhost:3001/overlay/snippets/${fileName}`,
      };
      overlayWebSocket.send(JSON.stringify(payload));
      ttsCount++;
      clickhouseClient?.insert({
        table: "tts_reads",
        values: [
          {
            tts_number: ttsCount,
            tts_time: Date.now(),
            user_name: message.chatterName,
            user_display_name: message.chatterDisplayName,
            message: message.messageText,
          },
        ],
        format: "JSONEachRow",
      });
    } catch (error) {
      console.log("Couldn't generate TTS of chat message. " + error);
    }
  }

  try {
    await clickhouseClient?.insert({
      table: "chat_messages",
      values: [
        {
          user_display_name: message.chatterDisplayName,
          message: message.messageText,
          timestamp: Date.now(),
          user_name: message.chatterName,
          user_id: message.chatterId,
        },
      ],
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("Error inserting chat message:", error);
  }
}
