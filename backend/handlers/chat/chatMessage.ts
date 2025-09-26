import type { MessageEvent } from "@twurple/easy-bot";
import { clickhouseClient } from "../clickhouse.ts";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

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
  message: MessageEvent,
  openai: OpenAI,
  overlayWebSocket: WebSocket
) {
  if (message.isAction) return;
  const USER_NAME = message.userDisplayName.toLowerCase();
  if (VIP_LIST[USER_NAME] != null) {
    console.log("Pinged");
    // Try to generate TTS, but don't block sending the follow event if it fails
    try {
      const fileName = USER_NAME + Date.now() + ".mp3";
      const speechFile = path.resolve("./overlay/snippets/" + fileName);
      const inputStream = await openai.audio.speech.create({
        model: "kokoro",
        input: message.text,
        voice: VIP_LIST[USER_NAME],
      });
      const buffer = Buffer.from(await inputStream.arrayBuffer());
      await fs.promises.writeFile(speechFile, buffer);
    } catch (error) {
      console.log("Couldn't generate TTS of chat message. " + error);
    } finally {
      // Always attempt to send the follow event for debugging
      try {
        const payload: ttsMessage = {
          mode: "follow",
          url: message.userName, // repurposed to carry username for the overlay
        };
        // Guard against missing/closed socket
        if (
          (overlayWebSocket as any) &&
          (overlayWebSocket as any).readyState === 1
        ) {
          overlayWebSocket.send(JSON.stringify(payload));
        } else {
          console.warn(
            "[WARN]: Overlay WebSocket not connected; could not send follow event."
          );
        }
      } catch (sendErr) {
        console.error(
          "[ERROR]: Failed to send follow event to overlay:",
          sendErr
        );
      }
    }
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
          user_id: message.userId,
        },
      ],
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("Error inserting chat message:", error);
  }
}
