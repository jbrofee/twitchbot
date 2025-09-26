import React, { createContext, useEffect, useRef, useState } from "react";

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
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
  cropToBounds?: number;
  cropTop?: number;
  height: number;
  positionX: number;
  positionY: number;
  rotation: number;
  scaleX?: number;
  scaleY?: number;
  sourceHeight?: number;
  sourceWidth?: number;
  width: number;
}

interface WebSocketContextType {
  audioInstances: AudioInstance[];
  sendMessage: (message: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
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
    }
  );
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const audioCounterRef = useRef(0);
  const followCounterRef = useRef(0);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/websocket");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (message) => {
      const parsedData = JSON.parse(message.data);
      switch (parsedData.mode) {
        case "tts":
          playAudioFromUrl(parsedData.url);
          break;
        case "follow":
          playFollowAlert(parsedData.username);
          break;
        case "camera":
          console.log("Updating camera box");
          updateCameraBox(parsedData.payload);
          break;
        default:
          console.log("No match found");
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    wsConnectionRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        audioInstances.forEach((instance) => {
          instance.audio.pause();
          instance.audio.src = "";
        });
      }
    };
  }, []); // Empty deps to run only once

  const playAudioFromUrl = (url: string) => {
    const audioId = `audio_${audioCounterRef.current++}`;
    const audio = new Audio(url);
    audio.preload = "auto";

    const audioInstance: AudioInstance = {
      id: audioId,
      url,
      audio,
    };

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

    // Trigger animation after a brief delay to ensure DOM update
    setTimeout(() => {
      setFollowAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isVisible: true } : alert
        )
      );
    }, 50);

    // Hide alert after 3 seconds
    setTimeout(() => {
      setFollowAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isVisible: false } : alert
        )
      );
    }, 3000);

    // Remove alert from DOM after animation completes
    setTimeout(() => {
      setFollowAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
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

  function updateCameraBox(payload: CameraTransformInfo) {
    setCameraDimensions({
      width: payload.width,
      height: payload.height,
      positionX: payload.positionX,
      positionY: payload.positionY,
      rotation: payload.rotation,
    });
  }

  return (
    <WebSocketContext.Provider value={{ audioInstances, sendMessage }}>
      {children}

      {/* Camera box */}
      <div
        style={{
          position: "fixed",
          left: `${cameraDimensions?.positionX}px`,
          top: `${cameraDimensions?.positionY}px`,
          width: `${cameraDimensions?.width + 10}px`,
          height: `${cameraDimensions.height + 10}px`,
          border: "5px solid #FFD700",
          backgroundColor: "transparent",
        }}
      />

      {/* Follow Alert Container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        {followAlerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              position: "absolute",
              top: "20px",
              right: alert.isVisible ? "20px" : "-400px",
              backgroundColor: "#6441a5",
              color: "white",
              padding: "20px 30px",
              borderRadius: "10px",
              fontSize: "24px",
              fontWeight: "bold",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              transition: "right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
              minWidth: "250px",
              textAlign: "center",
              border: "3px solid #9147ff",
            }}
          >
            🎉 Thanks for following, {alert.username}! 🎉
          </div>
        ))}
      </div>
    </WebSocketContext.Provider>
  );
};
