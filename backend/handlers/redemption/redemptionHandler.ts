import type { ClickHouseClient } from "@clickhouse/client";
import type { ApiClient } from "@twurple/api";
import type { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";
import type OBSWebSocket from "obs-websocket-js";

export default async function redemptionHandler(
  redemption: EventSubChannelRedemptionAddEvent,
  apiClient: ApiClient,
  twitchUserId: string,
  obs: OBSWebSocket,
  clickhouseClient: ClickHouseClient
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
        console.error("Error starting ad.", {
          status: error.status,
          message: error.message,
          body: error.body,
        });
      }
      break;
    // TODO finish implementing redemptions

    case "Mute the streamer":
      try {
        obs.call("SetInputMute", {
          inputName: "Mic/Aux",
          inputMuted: true,
        });
      } catch (error) {
        console.error("[ERROR] Couldn't mute mic. " + error);
      }
      break;

    default:
      console.log("Didn't hit a check on redemption");
      break;
  }
}
