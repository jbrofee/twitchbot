import type { ApiClient } from "@twurple/api";
import type { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";

export default async function redemptionHandler(
  redemption: EventSubChannelRedemptionAddEvent,
  apiClient: ApiClient,
  twitchUserId: string
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

    default:
      console.log("Didn't hit a check on redemption");
      break;
  }
}
