import type OBSWebSocket from "obs-websocket-js";

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

export default async function obsInitialize(
  obs: OBSWebSocket,
  overlayWebSocket: WebSocket
) {
  obs.on("CurrentProgramSceneChanged", async () => {
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
    console.log(transformInfo.alignment);
    overlayWebSocket.send(
      JSON.stringify({
        mode: "camera",
        payload: transformInfo,
      })
    );
  });
}
