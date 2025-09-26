import type OBSWebSocket from "obs-websocket-js";
import type { NodeClickHouseClient } from "@clickhouse/client/dist/client.js";

interface TransformInfo {
  alignment: number;
  boundsAlignment: number;
  boundsHeight: number;
  boundsType: string;
  boundsWidth: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  cropToBounds: number;
  cropTop: number;
  height: number;
  positionX: number;
  positionY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  sourceHeight: number;
  sourceWidth: number;
  width: number;
}

var sceneChangeCount = 0;

// TODO check out other available events for ideas
export default async function obsInitialize(
  obs: OBSWebSocket,
  getOverlayWebSocket: () => WebSocket | null,
  clickhouseClient: NodeClickHouseClient
) {
  obs.on("SceneTransitionStarted", async () => {
    console.info("[INFO]: OBS Scene changed.");
    sceneChangeCount++;
    clickhouseClient.insert({
      table: "scene_changes",
      values: [
        {
          change_number: sceneChangeCount,
          change_time: Date.now(),
        },
      ],
      format: "JSONEachRow",
    });
    // Get the current WebSocket connection
    const overlayWebSocket = getOverlayWebSocket();
    if (!overlayWebSocket) {
      console.warn(
        "[WARN]: No WebSocket connection available for OBS scene change."
      );
      return;
    }

    const currentScene = await obs.call("GetCurrentProgramScene");
    const webcamId = await obs.call("GetSceneItemId", {
      sceneName: currentScene.sceneName,
      sourceName: "Webcam",
    });
    const webcamSizing = await obs.call("GetSceneItemTransform", {
      sceneName: currentScene.sceneName,
      sceneItemId: webcamId.sceneItemId,
    });
    const transformInfo =
      webcamSizing.sceneItemTransform as unknown as TransformInfo;
    overlayWebSocket.send(
      JSON.stringify({
        mode: "camera",
        payload: transformInfo,
      })
    );
  });
}
