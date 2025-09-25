import "./App.css";

function App() {
  const wsConnection = new WebSocket("ws://localhost:3001/websocket");
  wsConnection.onopen = () => {
    console.log("Connected to WebSocket server");
  };

  wsConnection.onmessage = (message) => {
    console.log("Message recevied: " + message);
  };

  wsConnection.onclose = () => {
    console.log("WebSocket connection closed");
  };

  function sendWsMessage() {
    wsConnection.send("Hello!");
  }

  return (
    <>
      <div className="text-2xl">Testing Tailwind</div>
      <button onClick={sendWsMessage}>Send test message</button>
    </>
  );
}

export default App;
