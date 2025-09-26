import type OBSWebSocket from "obs-websocket-js";

export default function obsInitialize(obs: OBSWebSocket) {
  obs.on("CurrentProgramSceneChanged", (args) => {
    console.log(args);
  });
}
