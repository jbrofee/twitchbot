import type { MessageEvent } from "@twurple/easy-bot";
import { clickhouseClient } from "../../clickhouse.ts";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const VIP_LIST: Record<string, string> = {
  septten: "af_aoede",
  lanzsdiff: "am_adam",
  simpletoon: "am_michael",
  oneclumsybat: "af_nova",
  roystton: "am_liam",
  black_tomcat: "am_onyx",
  probakis: "am_echo",
  jbrofee: "pm_alex",
};

export default async function chatMessageHandler(
  message: MessageEvent,
  openai: OpenAI
) {
  const USER_NAME = message.userDisplayName.toLowerCase();
  if (VIP_LIST[USER_NAME] != null) {
    const speechFile = path.resolve(
      "./handlers/chat/snippets/" + USER_NAME + Date.now() + ".mp3"
    );
    const inputStream = await openai.audio.speech.create({
      model: "kokoro",
      input: message.text,
      voice: VIP_LIST[USER_NAME],
    });
    const buffer = Buffer.from(await inputStream.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
  }

  console.info(message.text, message.userDisplayName);
  try {
    await clickhouseClient?.insert({
      table: "chat_messages",
      values: [
        {
          user_display_name: message.userDisplayName,
          message: message.text,
          timestamp: Date.now(),
          user_name: message.userName,
        },
      ],
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("Error inserting chat message:", error);
  }
}
