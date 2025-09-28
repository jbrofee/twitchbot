import type { ApiClient } from "@twurple/api";

const rewardList = [
  {
    title: "Mute the streamer",
    cost: 500,
    prompt: "Mute the streamers mic in OBS pepeLaugh",
    input: false,
  },
  {
    title: "Ad Time",
    cost: 1000,
    prompt: "Immediately plays an ad",
    input: false,
  },
  {
    title: "Timeout somebody else",
    cost: 2000,
    prompt:
      "Times out another user. Type their username exactly with no leading or trailing spaces.",
    input: true,
  },
  {
    title: "End stream",
    cost: 100000,
    prompt:
      "This is hooked into OBS and will literally immediately end the stream",
    input: false,
  },
];

export default async function setupRedemptions(
  apiClient: ApiClient,
  broadcasterId: string
) {
  try {
    // getCustomRewards is a method; it must be CALLED with the broadcaster ID
    const rewards = await apiClient.channelPoints.getCustomRewards(
      broadcasterId
    );

    // Delete all rewards except the one titled "First"
    for (const reward of rewards) {
      if (reward?.title === "First") continue; // skip
      await apiClient.channelPoints.deleteCustomReward(
        broadcasterId,
        reward.id
      );
    }
    console.info("[INFO]: Commands succesfully deleted.");
  } catch (error) {
    console.error("[ERROR]: Failed to fetch custom rewards:", error);
  }

  try {
    for (let i = 0; i < rewardList.length; i++) {
      await apiClient.channelPoints.createCustomReward(broadcasterId, {
        autoFulfill: false,
        title: rewardList[i]!.title,
        cost: rewardList[i]!.cost,
        prompt: rewardList[i]!.prompt,
        userInputRequired: rewardList[i]!.input,
      });
    }
    console.info("[INFO]: Commands successfully recreated.");
  } catch (error) {
    console.error("[ERROR]: Couldn't create channel points: " + error);
  }
}
