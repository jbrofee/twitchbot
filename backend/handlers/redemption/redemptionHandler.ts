import type { ApiClient } from "@twurple/api";
import type { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";
import type OBSWebSocket from "obs-websocket-js";

// TODO track redemptions in Clickhouse

export default async function redemptionHandler(
  redemption: EventSubChannelRedemptionAddEvent,
  apiClient: ApiClient,
  twitchUserId: string,
  obs: OBSWebSocket
) {
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

    case "Mute the streamer":
      try {
        obs.call("SetInputMute", {
          inputName: "Mic/Aux",
          inputMuted: true,
        });
      } catch (error) {
        console.error("Couldn't mute mic.");
      }
      break;

    default:
      console.log("Didn't hit a check on redemption");
      break;
  }
}
