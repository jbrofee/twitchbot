import React, { createContext, useEffect, useRef, useState } from "react";

interface AudioInstance {
  id: string;
  url: string;
  audio: HTMLAudioElement;
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
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const audioCounterRef = useRef(0);

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

  const sendMessage = (message: string) => {
    if (
      wsConnectionRef.current &&
      wsConnectionRef.current.readyState === WebSocket.OPEN
    ) {
      wsConnectionRef.current.send(message);
    }
  };

  return (
    <WebSocketContext.Provider value={{ audioInstances, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
