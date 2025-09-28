import type { ClickHouseClient } from "@clickhouse/client";
import type { ApiClient } from "@twurple/api";
import type { Bot } from "@twurple/easy-bot";
import type { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";
import type OBSWebSocket from "obs-websocket-js";

export default async function redemptionHandler(
  redemption: EventSubChannelRedemptionAddEvent,
  apiClient: ApiClient,
  twitchUserId: string,
  obs: OBSWebSocket,
  clickhouseClient: ClickHouseClient,
  bot: Bot
) {
  // Add redemption to Clickhouse
  try {
    await clickhouseClient.insert({
      table: "redemptions",
      values: [
        {
          user_id: redemption.userId,
          user_display_name: redemption.userDisplayName,
          user_name: redemption.userName,
          reward_title: redemption.rewardTitle,
          input_text: redemption.input,
          reward_cost: redemption.rewardCost,
          redemption_date: Date.now(),
        },
      ],
      format: "JSONEachRow",
    });
    console.info("[INFO] Added redemption info to Clickhouse.");
  } catch (error) {
    console.error(
      "[ERROR] Couldn't add redemption info to Clickhouse. " + error
    );
  }

  const redemptionTitle = redemption.rewardTitle;
  switch (redemptionTitle) {
    case "Ad Time":
      try {
        const result = await apiClient.channels.startChannelCommercial(
          twitchUserId,
          30
        );
      } catch (error: any) {
        console.error("[ERROR]: Error starting ad.", error);
        throw error;
      }
      break;

    case "Mute the streamer":
      try {
        await obs.call("SetInputMute", {
          inputName: "Mic/Aux",
          inputMuted: true,
        });
        const activeScene = await obs.call("GetCurrentProgramScene");
        const currentScene = await obs.call("GetSceneItemList", {
          sceneName: activeScene.currentProgramSceneName,
        });

        // Enable the "Mute logo" scene item
        const sceneName = activeScene.currentProgramSceneName;
        // Prefer dynamic lookup to avoid hardcoding IDs that can change between sessions
        const muteLogoItem = (currentScene as any).sceneItems?.find(
          (i: any) => i.sourceName?.toLowerCase() === "mute logo"
        );

        if (muteLogoItem?.sceneItemId != null) {
          await obs.call("SetSceneItemEnabled", {
            sceneName,
            sceneItemId: muteLogoItem.sceneItemId,
            sceneItemEnabled: true,
          });
        }
      } catch (error) {
        console.error("[ERROR] Couldn't mute mic. " + error);
        throw error;
      }
      break;

    case "Timeout somebody else":
      try {
        await bot.timeout("jbrofee", redemption.input, 60, "Redemption");
        await bot.say(
          "jbrofee",
          `${redemption.input} is timed out everyone talk shit about them`
        );
      } catch (error) {
        // console.error("[ERROR]: Could not timeout user. " + error);
        throw error;
      }
      break;

    case "End stream":
      try {
        await obs.call("StopStream");
      } catch (error) {
        console.error("[ERROR]: Could not end stream. " + error);
        // Not a redeemable failure but propagate to outer catch if you want to refund
        throw error;
      }
      break;

    default:
      console.log("Didn't hit a check on redemption");
      break;
  }
}
