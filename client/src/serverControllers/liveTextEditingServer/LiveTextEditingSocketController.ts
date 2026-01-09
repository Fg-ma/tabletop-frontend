import TableTextMedia from "../../media/fgTableText/TableTextMedia";
import { StaticContentMediaType } from "../../context/mediaContext/lib/typeConstant";
import {
  IncomingLiveTextEditingMessages,
  onDocSavedNewContentType,
  OutGoingLiveTextEditingMessages,
} from "./lib/typeConstant";
import { DownloadSignals } from "../../context/uploadDownloadContext/lib/typeConstant";
import LiveTextDownloader from "../../tools/liveTextDownloader/LiveTextDownloader";
import Downloader from "../../tools/downloader/Downloader";

class LiveTextEditingSocketController {
  private ws: WebSocket | undefined;
  private messageListeners: Set<
    (message: IncomingLiveTextEditingMessages) => void
  > = new Set();

  constructor(
    private url: string,
    private tableId: string,
    private username: string,
    private instance: string,
    private staticContentMedia: React.MutableRefObject<StaticContentMediaType>,
    private liveTextEditingSocket: React.MutableRefObject<
      LiveTextEditingSocketController | undefined
    >,
    private sendDownloadSignal: (signal: DownloadSignals) => void,
    private addCurrentDownload: (
      id: string,
      upload: Downloader | LiveTextDownloader,
    ) => void,
    private removeCurrentDownload: (id: string) => void,
  ) {
    this.connect();
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

  private connect = () => {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onmessage = (event: MessageEvent) => {
      let message: IncomingLiveTextEditingMessages | undefined = undefined;

      if (event.data instanceof ArrayBuffer) {
        const buf = new Uint8Array(event.data);
        const view = new DataView(buf.buffer);

        // 1) Read first 4 bytes for JSON length
        const headerLen = view.getUint32(0, true);

        // 2) Slice out the JSON header
        const headerBytes = buf.subarray(4, 4 + headerLen);
        const headerText = new TextDecoder().decode(headerBytes);
        const header = JSON.parse(headerText);

        // 3) The rest of file chunk
        const fileBuffer = buf.subarray(4 + headerLen);

        switch (header.type) {
          case "docUpdated":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
                instanceId: header.header.instanceId,
              },
              data: {
                payload: fileBuffer,
              },
            };
            break;
          case "initialDocResponded":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
                instanceId: header.header.instanceId,
                lastOps: header.header.lastOps,
              },
              data: {
                payload:
                  fileBuffer.byteLength !== 0 ? this.unpackOps(fileBuffer) : [],
              },
            };
            break;
          case "savedOps":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
                instanceId: header.header.instanceId,
                lastOps: header.header.lastOps,
              },
              data: {
                payload:
                  fileBuffer.byteLength !== 0 ? this.unpackOps(fileBuffer) : [],
              },
            };
            break;
          case "getSavedOpsResponse":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
                instanceId: header.header.instanceId,
                lastOps: header.header.lastOps,
              },
              data: {
                payload:
                  fileBuffer.byteLength !== 0 ? this.unpackOps(fileBuffer) : [],
              },
            };
            break;
          case "chunk":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
              },
              data: {
                payload: fileBuffer,
              },
            };
            break;
          case "oneShotDownload":
            message = {
              type: header.type,
              header: {
                contentId: header.header.contentId,
              },
              data: {
                payload: fileBuffer,
                fileSize: header.header.fileSize,
              },
            };
            break;
          default:
            return;
        }
      } else {
        if (typeof event.data === "string") {
          message = JSON.parse(event.data) as IncomingLiveTextEditingMessages;
        }
      }

      if (message) {
        this.handleMessage(message);

        this.messageListeners.forEach((listener) => {
          listener(message);
        });
      }
    };

    this.ws.onclose = (event) => {
      console.warn("WebSocket closed", event.code, event.reason);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  private unpackOps = (
    buffer: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer>[] => {
    const updates: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;
    while (offset < buffer.length) {
      const len = new DataView(
        buffer.buffer,
        buffer.byteOffset + offset,
        4,
      ).getUint32(0, true);
      const update = buffer.slice(offset + 4, offset + 4 + len);
      updates.push(update);
      offset += 4 + len;
    }
    return updates;
  };

  addMessageListener = (
    listener: (message: IncomingLiveTextEditingMessages) => void,
  ): void => {
    this.messageListeners.add(listener);
  };

  removeMessageListener = (
    listener: (message: IncomingLiveTextEditingMessages) => void,
  ): void => {
    this.messageListeners.delete(listener);
  };

  onDocSavedNewContent = (event: onDocSavedNewContentType) => {
    const { oldContentId, newContentId, instanceId } = event.header;

    const oldContent = this.staticContentMedia.current.text.table[oldContentId];

    const newTableTextMedia = new TableTextMedia(
      newContentId,
      oldContent.filename,
      oldContent.mimeType,
      [],
      this.liveTextEditingSocket,
      this.sendDownloadSignal,
      this.addCurrentDownload,
      this.removeCurrentDownload,
      oldContent.loadingState === "downloaded"
        ? oldContent.textData
        : undefined,
      oldContent.loadingState === "downloaded"
        ? oldContent.fileSize
        : undefined,
    );
    this.staticContentMedia.current.text.table[newContentId] =
      newTableTextMedia;

    this.staticContentMedia.current.text.tableInstances[instanceId].textMedia =
      newTableTextMedia;
  };

  handleMessage = (message: IncomingLiveTextEditingMessages) => {
    switch (message.type) {
      case "docSavedNewContent":
        this.onDocSavedNewContent(message);
        break;
      default:
        break;
    }
  };

  sendMessage = (message: OutGoingLiveTextEditingMessages) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(message);
      const encoder = new TextEncoder();
      const jsonBytes = encoder.encode(jsonStr);

      const messageBuffer = new Uint8Array(1 + jsonBytes.length);
      messageBuffer[0] = 0x00;
      messageBuffer.set(jsonBytes, 1);

      this.ws.send(messageBuffer);
    }
  };

  sendBinaryMessage = (type: string, header: object, data: Uint8Array) => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // 1) Build the JSON header
    const headerObj = { type, header };
    const headerStr = JSON.stringify(headerObj);
    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(headerStr);
    const headerLen = headerBytes.length;

    // 2) Allocate a buffer: 1 for prefix + 4 bytes for length + header + data
    const message = new Uint8Array(5 + headerLen + data.length);

    message[0] = 0x01;

    // 3) Write header length LE
    new DataView(message.buffer).setUint32(1, headerLen, true);

    // 4) Copy in the header bytes, then the data bytes
    message.set(headerBytes, 5);
    message.set(data, 5 + headerLen);

    this.ws.send(message);
  };

  getInitialDocState = (contentId: string, instanceId: string) => {
    this.sendMessage({
      type: "getInitialDocState",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
        instanceId,
      },
    });
  };

  docUpdate = (contentId: string, instanceId: string, data: Uint8Array) => {
    this.sendBinaryMessage(
      "docUpdate",
      {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
        instanceId,
      },
      data,
    );
  };

  getSavedOps = (contentId: string, instanceId: string) => {
    this.sendMessage({
      type: "getSavedOps",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
        instanceId,
      },
    });
  };

  docSave = (contentId: string, instanceId: string) => {
    this.sendMessage({
      type: "docSave",
      header: {
        tableId: this.tableId,
        contentId,
        instanceId,
      },
    });
  };

  getFile = (contentId: string) => {
    this.sendMessage({
      type: "getDownloadMeta",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
      },
    });
  };

  getChunk = (contentId: string, range: string) => {
    this.sendMessage({
      type: "getFileChunk",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
      },
      data: { range },
    });
  };
}

export default LiveTextEditingSocketController;
