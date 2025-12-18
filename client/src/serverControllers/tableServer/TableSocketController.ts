import { ContentTypes } from "../../../../universal/contentTypeConstant";
import {
  TableReactions,
  TableReactionStyles,
} from "../../../../universal/reactionsTypeConstant";
import { FgBackground } from "../../elements/fgBackgroundSelector/lib/typeConstant";
import {
  IncomingTableMessages,
  OutGoingTableMessages,
} from "./lib/typeConstant";

class TableSocketController {
  private ws: WebSocket | undefined;
  private messageListeners: Set<(message: IncomingTableMessages) => void> =
    new Set();

  constructor(
    private url: string,
    private tableId: string,
    private username: string,
    private instance: string,
  ) {
    this.connect(this.url);
  }

  deconstructor = () => {
    if (this.ws) {
      this.ws.close();
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      this.ws = undefined;
    }

    this.messageListeners.clear();
  };

  private connect = (url: string) => {
    this.ws = new WebSocket(url);

    this.ws.onmessage = async (event: MessageEvent) => {
      let data: string;

      if (event.data instanceof Blob) {
        data = await event.data.text();
      } else {
        data = event.data;
      }

      const message = JSON.parse(data);

      this.messageListeners.forEach((listener) => {
        listener(message as IncomingTableMessages);
      });
    };

    this.ws.onopen = () => {
      this.joinTable();
    };
  };

  addMessageListener = (
    listener: (message: IncomingTableMessages) => void,
  ): void => {
    this.messageListeners.add(listener);
  };

  removeMessageListener = (
    listener: (message: IncomingTableMessages) => void,
  ): void => {
    this.messageListeners.delete(listener);
  };

  sendMessage = (message: OutGoingTableMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  joinTable = () => {
    this.sendMessage({
      type: "joinTable",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
      },
    });
  };

  leaveTable = () => {
    this.sendMessage({
      type: "leaveTable",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
      },
    });
  };

  changeTableBackground = (background: FgBackground) => {
    this.sendMessage({
      type: "changeTableBackground",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
      },
      data: { background },
    });
  };

  moveSeats = (direction: "left" | "right", username: string) => {
    this.sendMessage({
      type: "moveSeats",
      header: {
        tableId: this.tableId,
        username,
      },
      data: { direction },
    });
  };

  swapSeats = (targetUsername: string) => {
    if (targetUsername === this.username) return;

    this.sendMessage({
      type: "swapSeats",
      header: {
        tableId: this.tableId,
        username: this.username,
        targetUsername,
      },
    });
  };

  kickFromTable = (targetUsername: string) => {
    if (targetUsername === this.username) return;

    this.sendMessage({
      type: "kickFromTable",
      header: {
        tableId: this.tableId,
        username: this.username,
        targetUsername,
      },
    });
  };

  reaction = (
    contentType: ContentTypes,
    reaction: TableReactions,
    reactionStyle: TableReactionStyles,
    contentId?: string,
    instanceId?: string,
  ) => {
    this.sendMessage({
      type: "reaction",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
        instanceId,
      },
      data: { reaction, reactionStyle },
    });
  };
}

export default TableSocketController;
