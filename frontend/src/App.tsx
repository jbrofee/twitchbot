import React, { createContext, useEffect, useRef, useState } from "react";
import "./alerts.css";

interface AudioInstance {
  id: string;
  url: string;
  audio: HTMLAudioElement;
}

interface FollowAlert {
  id: string;
  username: string;
  isVisible: boolean;
}

interface CameraTransformInfo {
  alignment?: number;
  boundsAlignment?: number;
  boundsHeight?: number;
  boundsType?: string;
  boundsWidth?: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  cropToBounds?: number;
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

interface WebSocketContextType {
  audioInstances: AudioInstance[];
  sendMessage: (message: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [audioInstances, setAudioInstances] = useState<AudioInstance[]>([]);
  const [followAlerts, setFollowAlerts] = useState<FollowAlert[]>([]);
  const [cameraDimensions, setCameraDimensions] = useState<CameraTransformInfo>(
    {
      width: 400,
      height: 500,
      rotation: 0,
      positionX: 100,
      positionY: 100,
      cropRight: 0,
      cropLeft: 0,
      cropBottom: 0,
      cropTop: 0,
      sourceWidth: 1920,
      sourceHeight: 1080,
      scaleX: 1,
      scaleY: 1,
    }
  );

  const wsConnectionRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const manuallyClosedRef = useRef(false);
  const audioCounterRef = useRef(0);
  const followCounterRef = useRef(0);
  const audioInstancesRef = useRef<AudioInstance[]>([]);

  useEffect(() => {
    audioInstancesRef.current = audioInstances;
  }, [audioInstances]);

  useEffect(() => {
    const WS_URL = "ws://localhost:3001/websocket";

    const scheduleReconnect = () => {
      if (manuallyClosedRef.current) return;
      const attempt = reconnectAttemptRef.current;
      const delay =
        Math.min(10000, 250 * Math.pow(2, attempt)) +
        Math.floor(Math.random() * 250);
      if (reconnectTimeoutRef.current)
        window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectAttemptRef.current += 1;
        connect();
      }, delay);
      console.warn(
        `[WS] Scheduling reconnect in ${delay}ms (attempt ${attempt + 1})`
      );
    };

    const connect = () => {
      try {
        console.log("[WS] Connecting...");
        const ws = new WebSocket(WS_URL);
        wsConnectionRef.current = ws;

        ws.onopen = () => {
          console.log("[WS] Connected");
          reconnectAttemptRef.current = 0;
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (message) => {
          try {
            const parsedData = JSON.parse(message.data);
            switch (parsedData.mode) {
              case "tts":
                if (parsedData.url) playAudioFromUrl(parsedData.url);
                break;
              case "follow":
                console.log("[WS] Follow event");
                if (parsedData.url) playFollowAlert(parsedData.url);
                break;
              case "camera":
                if (parsedData?.payload) updateCameraBox(parsedData.payload);
                break;
              default:
                console.debug("[WS] Unhandled mode", parsedData?.mode);
            }
          } catch (err) {
            console.error("[WS] Error parsing message", err, message.data);
          }
        };

        ws.onerror = (event) => {
          console.error("[WS] Error", event);
        };

        ws.onclose = (event) => {
          console.warn(`[WS] Closed code=${event.code} reason=${event.reason}`);
          if (!manuallyClosedRef.current) scheduleReconnect();
        };
      } catch (err) {
        console.error("[WS] Connect threw", err);
        scheduleReconnect();
      }
    };

    manuallyClosedRef.current = false;
    connect();

    return () => {
      manuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (
        wsConnectionRef.current &&
        wsConnectionRef.current.readyState === WebSocket.OPEN
      ) {
        try {
          wsConnectionRef.current.close();
        } catch {
          // ignore close error
        }
      }
      audioInstancesRef.current.forEach((instance) => {
        instance.audio.pause();
        instance.audio.src = "";
      });
    };
  }, []);

  const playAudioFromUrl = (url: string) => {
    const audioId = `audio_${audioCounterRef.current++}`;
    const audio = new Audio(url);
    audio.preload = "auto";

    const audioInstance: AudioInstance = { id: audioId, url, audio };
    setAudioInstances((prev) => [...prev, audioInstance]);

    audio.onended = () => {
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
      audio.src = "";
    };
    audio.onerror = (error) => {
      console.error(`Failed to load audio: ${url}`, error);
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
    };
    audio.play().catch((error) => {
      console.error(`Failed to play audio: ${url}`, error);
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
    });
  };

  const playFollowAlert = (username: string) => {
    const alertId = `follow_${followCounterRef.current++}`;
    const followAlert: FollowAlert = {
      id: alertId,
      username,
      isVisible: false,
    };
    setFollowAlerts((prev) => [...prev, followAlert]);

    setTimeout(() => {
      setFollowAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isVisible: true } : a))
      );
    }, 50);
    setTimeout(() => {
      setFollowAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isVisible: false } : a))
      );
    }, 3000);
    setTimeout(() => {
      setFollowAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }, 3500);
  };

  const sendMessage = (message: string) => {
    if (
      wsConnectionRef.current &&
      wsConnectionRef.current.readyState === WebSocket.OPEN
    ) {
      wsConnectionRef.current.send(message);
    }
  };

  function updateCameraBox(payload: Partial<CameraTransformInfo>) {
    setCameraDimensions((prev) => ({ ...prev, ...payload }));
  }

  // Precompute camera border box width/height for stable rendering
  const srcW = Number.isFinite(cameraDimensions.sourceWidth)
    ? cameraDimensions.sourceWidth
    : 1920;
  const srcH = Number.isFinite(cameraDimensions.sourceHeight)
    ? cameraDimensions.sourceHeight
    : 1080;
  const cropL = Number.isFinite(cameraDimensions.cropLeft)
    ? cameraDimensions.cropLeft
    : 0;
  const cropR = Number.isFinite(cameraDimensions.cropRight)
    ? cameraDimensions.cropRight
    : 0;
  const cropT = Number.isFinite(cameraDimensions.cropTop)
    ? cameraDimensions.cropTop
    : 0;
  const cropB = Number.isFinite(cameraDimensions.cropBottom)
    ? cameraDimensions.cropBottom
    : 0;
  const scaleX =
    cameraDimensions.scaleX && cameraDimensions.scaleX !== 0
      ? cameraDimensions.scaleX
      : 1;
  const scaleY =
    cameraDimensions.scaleY && cameraDimensions.scaleY !== 0
      ? cameraDimensions.scaleY
      : 1;
  const camBorderWidth = Math.max(0, (srcW - cropL - cropR) * scaleX - 5);
  const camBorderHeight = Math.max(0, (srcH - cropT - cropB) * scaleY - 5);

  return (
    <WebSocketContext.Provider value={{ audioInstances, sendMessage }}>
      {children}
      <div>
        {/* Camera box */}
        <div
          style={{
            position: "fixed",
            left: `${cameraDimensions.positionX}px`,
            top: `${cameraDimensions.positionY}px`,
            width: `${camBorderWidth - 5}px`,
            height: `${camBorderHeight - 10}px`,
            transform: `rotate(${cameraDimensions.rotation}deg)`,
            border: "10px solid #FFD700",
            backgroundColor: "transparent",
            zIndex: 5,
          }}
        />

        {/* Follow alerts */}
        <div>
          {followAlerts.map((alert) => {
            const posX = Number.isFinite(cameraDimensions.positionX)
              ? cameraDimensions.positionX
              : 100;
            const posY = Number.isFinite(cameraDimensions.positionY)
              ? cameraDimensions.positionY
              : 100;

            // Always position alerts underneath the camera box
            const gap = 15;
            const cameraBottom = posY + camBorderHeight;
            const alertTop = cameraBottom + gap;

            return (
              <div
                key={alert.id}
                style={{
                  position: "fixed",
                  left: `${posX}px`,
                  top: `${alertTop}px`,
                  width: `${camBorderWidth}px`,
                  height: "60px",
                  pointerEvents: "none",
                  zIndex: alert.isVisible ? 6 : 4,
                  transform: `rotate(${cameraDimensions.rotation}deg)`,
                  transition: "opacity 0.3s ease, transform 0.3s ease",
                  opacity: alert.isVisible ? 1 : 0,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "8px",
                    border: "3px solid #FFD700",
                    backgroundColor: "rgba(255, 215, 0, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#000000",
                    textShadow: "1px 1px 2px rgba(255,255,255,0.8)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  Thanks for the follow,{" "}
                  <span
                    style={{
                      textDecoration: "underline",
                      textDecorationColor: "#B8860B",
                      textUnderlineOffset: "3px",
                      marginLeft: "6px",
                      marginRight: "6px",
                      fontWeight: "900",
                    }}
                  >
                    {alert.username}
                  </span>
                  !
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WebSocketContext.Provider>
  );
};
