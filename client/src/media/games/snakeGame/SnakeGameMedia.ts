import { GameState, PlayersState, SnakeColorsType } from "./lib/typeConstant";
import GameMediaUniversalFunctions from "../GameMediaUniversalFunctions";

type OutGoingMessages =
  | {
      type: "snakeDirectionChange";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameId: string;
      };
      data: {
        direction: "up" | "down" | "left" | "right";
      };
    }
  | {
      type: "changeGridSize";
      header: {
        tableId: string;
        gameId: string;
      };
      data: {
        gridSize: number;
      };
    }
  | {
      type: "changeSnakeColor";
      header: {
        tableId: string;
        username: string;
        instance: string;
        gameId: string;
      };
      data: {
        newSnakeColor: SnakeColorsType;
      };
    };

export type SnakeGameListenerTypes =
  | onGameStartedType
  | onGameStateUpdateType
  | onGameOverType
  | onPlayersStateUpdatedType
  | onGridSizeChangedType
  | onInitialGameStatesReturnedType;

export type onGameStartedType = {
  type: "gameStarted";
};

export type onGameStateUpdateType = {
  type: "gameStateUpdate";
  data: {
    gameState: GameState;
  };
};

export type onGameOverType = {
  type: "gameOver";
};

export type onPlayersStateUpdatedType = {
  type: "playersStateUpdated";
  data: {
    playersState: PlayersState;
  };
};

export type onGridSizeChangedType = {
  type: "gridSizeChanged";
  data: {
    gridSize: number;
  };
};

export type onInitialGameStatesReturnedType = {
  type: "initialGameStatesReturned";
  data: {
    started: boolean;
    gameOver: boolean;
    playersState: PlayersState;
  };
};

class SnakeGameMedia extends GameMediaUniversalFunctions {
  initiator = false;

  positioning: {
    position: {
      left: number;
      top: number;
    };
    scale: {
      x: number;
      y: number;
    };
    rotation: number;
  } = {
    position: {
      left: 37.5,
      top: 37.5,
    },
    scale: {
      x: 25,
      y: 25,
    },
    rotation: 0,
  };

  private snakeGameListeners: Set<(message: SnakeGameListenerTypes) => void> =
    new Set();

  constructor(
    tableId: string,
    username: string,
    instance: string,
    gameId: string,
    private url: string,
    initiator: boolean,
    initPositioning?: {
      position: {
        left: number;
        top: number;
      };
      scale: {
        x: number;
        y: number;
      };
      rotation: number;
    },
  ) {
    super(tableId, username, instance, "snake", gameId);

    this.initiator = initiator;
    if (initPositioning) this.positioning = initPositioning;

    this.connect();
  }

  destructor = () => {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      this.snakeGameListeners.clear();

      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
    }
  };

  connect = () => {
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = async (event) => {
      let rawData: string;

      if (event.data instanceof Blob) {
        rawData = await event.data.text();
      } else {
        rawData = event.data;
      }

      let message: SnakeGameListenerTypes;
      try {
        message = JSON.parse(rawData);
      } catch (err) {
        console.error("Invalid JSON from WebSocket:", rawData);
        return;
      }
      this.snakeGameListeners.forEach((listener) => {
        listener(message);
      });
    };

    this.ws.onopen = () => {
      this.getInitialGameStates();
    };
  };

  sendMessage = (message: OutGoingMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  snakeDirectionChange = (direction: "up" | "down" | "left" | "right") => {
    this.sendMessage({
      type: "snakeDirectionChange",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameId: this.gameId,
      },
      data: {
        direction,
      },
    });
  };

  changeGridSize = (gridSize: number) => {
    this.sendMessage({
      type: "changeGridSize",
      header: {
        tableId: this.tableId,
        gameId: this.gameId,
      },
      data: {
        gridSize,
      },
    });
  };

  changeSnakeColor = (newSnakeColor: SnakeColorsType) => {
    this.sendMessage({
      type: "changeSnakeColor",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        gameId: this.gameId,
      },
      data: {
        newSnakeColor,
      },
    });
  };

  addSnakeGameListener = (
    listener: (message: SnakeGameListenerTypes) => void,
  ): void => {
    this.snakeGameListeners.add(listener);
  };

  removeSnakeGameListener = (
    listener: (message: SnakeGameListenerTypes) => void,
  ): void => {
    this.snakeGameListeners.delete(listener);
  };
}

export default SnakeGameMedia;
