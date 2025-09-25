import "./App.css";
import { useState, useEffect, useRef } from "react";

interface AudioInstance {
  id: string;
  url: string;
  audio: HTMLAudioElement;
}

function App() {
  const [audioInstances, setAudioInstances] = useState<AudioInstance[]>([]);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const audioCounterRef = useRef(0);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/websocket");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (message) => {
      console.log("Message received: " + message.data);
      playAudioFromUrl(message.data);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    wsConnectionRef.current = ws;

    // Cleanup on unmount
    return () => {
      ws.close();
      // Clean up any remaining audio instances
      audioInstances.forEach((instance) => {
        instance.audio.pause();
        instance.audio.src = "";
      });
    };
  }, []);

  const playAudioFromUrl = (url: string) => {
    const audioId = `audio_${audioCounterRef.current++}`;
    const audio = new Audio(url);

    // Configure audio for cleanup after playback
    audio.preload = "auto";

    const audioInstance: AudioInstance = {
      id: audioId,
      url,
      audio,
    };

    // Add to state for tracking
    setAudioInstances((prev) => [...prev, audioInstance]);

    // Set up event listeners
    audio.onended = () => {
      // Remove from state and cleanup
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
      audio.src = ""; // Unload the audio
    };

    audio.onerror = (error) => {
      console.error(`Failed to load audio: ${url}`, error);
      // Remove from state on error
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
    };

    // Play the audio
    audio.play().catch((error) => {
      console.error(`Failed to play audio: ${url}`, error);
      // Remove from state if play fails
      setAudioInstances((prev) =>
        prev.filter((instance) => instance.id !== audioId)
      );
    });
  };

  function sendWsMessage() {
    if (wsConnectionRef.current) {
      wsConnectionRef.current.send("Hello!");
    }
  }

  return (
    <div className="text-black">
      <div className="text-2xl">Testing Tailwind</div>
      <button onClick={sendWsMessage}>Send test messages</button>

      {audioInstances.map((instance) => (
        <div key={instance.id} className="text-sm text-gray-300">
          {instance.url}
        </div>
      ))}
    </div>
  );
}

export default App;
