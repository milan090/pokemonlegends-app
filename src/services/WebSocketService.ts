/**
 * Service for managing WebSocket connections to the game server
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectInterval: number = 2000;
  private pingInterval: number | null = null;
  private serverUrl: string;
  private lobbyId: string;
  private sessionToken: string;
  private messageHandler: (message: any) => void;
  private username: string;

  constructor(
    serverUrl: string,
    lobbyId: string,
    username: string,
    sessionToken: string,
    messageHandler: (message: any) => void
  ) {
    this.serverUrl = serverUrl;
    this.lobbyId = lobbyId;
    this.sessionToken = sessionToken;
    this.messageHandler = messageHandler;
    this.username = username;
    this.connect();
  }
  
  /**
   * Connect to the WebSocket server
   */
  private connect(): void {
    try {
      const wsUrl = `${this.serverUrl}/ws/${this.lobbyId}?username=${this.username}`;
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`Connected to game server in lobby: ${this.lobbyId}`);
        this.connected = true;
        this.startPingInterval();
        this.sendMessage({ 
          type: "join",
          session_token: this.sessionToken,
        });
      };

      this.ws.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        
        // Add debugging for battle-related messages
        if (parsedData.type === 'request_action') {
          console.log(`Received request_action for turn: ${parsedData.turn_number}`, parsedData);
        } else if (parsedData.type === 'turn_update') {
          console.log(`Received turn_update for turn: ${parsedData.turn_number}`, parsedData);
        } else if (parsedData.type === 'wild_battle_start') {
          console.log('Received wild_battle_start message', parsedData);
        } else if (parsedData.type === 'battle_result') {
          console.log('Received battle_result message', parsedData);
        }
        
        this.messageHandler(parsedData);
      };

      this.ws.onclose = () => {
        console.log("Disconnected from game server");
        this.connected = false;
        this.clearPingInterval();
        
        setTimeout(() => {
          console.log("Attempting to reconnect...");
          this.connect();
        }, this.reconnectInterval);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
    } catch (error) {
      console.error("Failed to connect to server:", error);
      
      setTimeout(() => {
        console.log("Attempting to reconnect...");
        this.connect();
      }, this.reconnectInterval);
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  public sendMessage(message: any): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start a ping interval to keep the connection alive
   */
  private startPingInterval(): void {
    this.clearPingInterval();
    
    this.pingInterval = window.setInterval(() => {
      if (this.connected) {
        this.sendMessage({ type: "ping" });
      }
    }, 30000);
  }

  /**
   * Clear the ping interval
   */
  private clearPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if the connection is established
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Clean up resources
   */
  public cleanUp(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.clearPingInterval();
    this.connected = false;
  }
} 