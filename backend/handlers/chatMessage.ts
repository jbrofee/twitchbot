import type { MessageEvent } from "@twurple/easy-bot";
import { clickhouseClient } from "../clickhouse.ts";

export default async function chatMessageHandler(message: MessageEvent) {
  console.log(message.text, message.userDisplayName);
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
