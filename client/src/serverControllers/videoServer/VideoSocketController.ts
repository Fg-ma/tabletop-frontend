import {
  StaticContentEffectsStylesType,
  StaticContentEffectsType,
} from "../../../../universal/effectsTypeConstant";
import { StaticContentMediaType } from "../../context/mediaContext/lib/typeConstant";
import {
  IncomingVideoMessages,
  onContentReuploadedType,
  onProcessingFinishedType,
  onReuploadCancelledType,
  onReuploadStartedType,
  onVideoFailedUploadType,
  onVideoUploadedToTabledType,
  onVideoUploadedToTableType,
  OutGoingVideoMessages,
} from "./lib/typeConstant";
import { StaticContentTypes } from "../../../../universal/contentTypeConstant";
import TableVideoMediaInstance from "../../media/fgTableVideo/TableVideoMediaInstance";
import TableVideoMedia from "../../media/fgTableVideo/TableVideoMedia";
import Deadbanding from "../../babylon/Deadbanding";
import UserDevice from "../../tools/userDevice/UserDevice";
import { GeneralSignals } from "../../context/signalContext/lib/typeConstant";

class VideoSocketController {
  private ws: WebSocket | undefined;
  private messageListeners: Set<(message: IncomingVideoMessages) => void> =
    new Set();

  constructor(
    private url: string,
    private tableId: string,
    private username: string,
    private instance: string,
    private staticContentMedia: React.MutableRefObject<StaticContentMediaType>,
    private deadbanding: React.MutableRefObject<Deadbanding>,
    private userDevice: React.MutableRefObject<UserDevice>,
    private staticContentEffects: React.MutableRefObject<StaticContentEffectsType>,
    private staticContentEffectsStyles: React.MutableRefObject<StaticContentEffectsStylesType>,
    private videoSocket: React.MutableRefObject<
      VideoSocketController | undefined
    >,
    private sendGeneralSignal: (signal: GeneralSignals) => void,
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
    this.ws.binaryType = "arraybuffer";

    this.ws.onmessage = (event: MessageEvent) => {
      let message: IncomingVideoMessages;

      if (event.data instanceof ArrayBuffer) {
        const buf = new Uint8Array(event.data);
        const view = new DataView(buf.buffer);

        // 1) Read first 4 bytes for JSON length
        const headerLen = view.getUint32(0);

        // 2) Slice out the JSON header
        const headerBytes = buf.subarray(4, 4 + headerLen);
        const headerText = new TextDecoder().decode(headerBytes);
        const header = JSON.parse(headerText);

        // 3) The rest of file chunk
        const fileBuffer = buf.subarray(4 + headerLen);

        switch (header.type) {
          case "oneShotDownload":
            message = {
              type: header.type,
              header: {
                contentType: header.header.contentType,
                contentId: header.header.contentId,
              },
              data: {
                buffer: fileBuffer,
              },
            };
            break;
          case "chunk":
            message = {
              type: header.type,
              header: {
                contentType: header.header.contentType,
                contentId: header.header.contentId,
                range: header.header.range,
              },
              data: {
                chunk: fileBuffer,
              },
            };
            break;
          default:
            return;
        }
      } else {
        message =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as IncomingVideoMessages)
            : { type: undefined };
      }

      this.handleMessage(message);

      this.messageListeners.forEach((listener) => {
        listener(message);
      });
    };

    this.ws.onopen = () => {
      this.joinTable();
    };
  };

  addMessageListener = (
    listener: (message: IncomingVideoMessages) => void,
  ): void => {
    this.messageListeners.add(listener);
  };

  removeMessageListener = (
    listener: (message: IncomingVideoMessages) => void,
  ): void => {
    this.messageListeners.delete(listener);
  };

  sendMessage = (message: OutGoingVideoMessages) => {
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

  deleteContent = (contentId: string, instanceId: string) => {
    this.sendMessage({
      type: "deleteContent",
      header: {
        tableId: this.tableId,
        contentId,
        instanceId,
      },
    });
  };

  getFile = (contentType: StaticContentTypes, contentId: string) => {
    this.sendMessage({
      type: "getDownloadMeta",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
        contentId,
      },
    });
  };

  getChunk = (
    contentType: StaticContentTypes,
    contentId: string,
    range: string,
  ) => {
    this.sendMessage({
      type: "getFileChunk",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentType,
        contentId,
      },
      data: { range },
    });
  };

  updateVideoMetadata = (
    contentId: string,
    instanceId: string,
    isPlaying: boolean,
    videoPosition: number,
    videoPlaybackSpeed: number,
    ended: boolean,
  ) => {
    this.sendMessage({
      type: "updateVideoMetadata",
      header: {
        tableId: this.tableId,
        contentId,
        instanceId,
      },
      data: { isPlaying, videoPosition, videoPlaybackSpeed, ended },
    });
  };

  requestCatchUpVideoMetadata = (contentId: string, instanceId: string) => {
    this.sendMessage({
      type: "requestCatchUpVideoMetadata",
      header: {
        tableId: this.tableId,
        username: this.username,
        instance: this.instance,
        contentId,
        instanceId,
      },
    });
  };

  deleteUploadSession = (uploadId: string, contentId: string) => {
    this.sendMessage({
      type: "deleteUploadSession",
      header: {
        uploadId,
        contentId,
      },
    });
  };

  signalReuploadStart = (
    contentType: StaticContentTypes,
    contentId: string,
  ) => {
    this.sendMessage({
      type: "signalReuploadStart",
      header: {
        tableId: this.tableId,
        contentType,
        contentId,
      },
    });
  };

  private handleMessage = (
    message: { type: undefined } | IncomingVideoMessages,
  ) => {
    switch (message.type) {
      case "videoUploadedToTable":
        this.onVideoUploadedToTable(message);
        break;
      case "videoUploadedToTabled":
        this.onVideoUploadedToTabled(message);
        break;
      case "dashVideoReady":
        {
          const { videoId } = message.header;

          // this.staticContentMedia.current.video[videoId]?.preloadDashStream(url);
        }
        break;
      case "contentReuploaded":
        this.onContentReuploaded(message);
        break;
      case "reuploadStarted":
        this.onReuploadStarted(message);
        break;
      case "reuploadCancelled":
        this.onReuploadCancelled(message);
        break;
      case "processingFinished":
        this.onProcessingFinished(message);
        break;
      default:
        break;
    }
  };

  private onProcessingFinished = (event: onProcessingFinishedType) => {
    const { contentId, filename, oneShot } = event.header;

    if (!oneShot) return;

    this.sendGeneralSignal({
      type: "tableInfoSignal",
      data: {
        message: `Completed ${filename} upload`,
        timeout: 2500,
      },
    });
  };

  private onReuploadStarted = (event: onReuploadStartedType) => {
    const { contentId, contentType } = event.header;

    this.staticContentMedia.current[contentType].table[contentId].loadingState =
      "reuploading";
  };

  private onReuploadCancelled = (event: onReuploadCancelledType) => {
    const { contentId, contentType } = event.header;

    this.staticContentMedia.current[contentType].table[contentId].loadingState =
      "downloaded";
  };

  private onVideoUploadedToTable = (message: onVideoUploadedToTableType) => {
    const { contentId, instanceId } = message.header;
    const { filename, mimeType, state, initPositioning } = message.data;

    if (this.videoSocket.current) {
      const newVideoMedia = new TableVideoMedia(
        contentId,
        filename,
        mimeType,
        state,
        this.staticContentEffects,
      );

      this.staticContentMedia.current.video.table[contentId] = newVideoMedia;

      this.staticContentMedia.current.video.tableInstances[instanceId] =
        new TableVideoMediaInstance(
          newVideoMedia,
          instanceId,
          this.userDevice,
          this.deadbanding,
          this.staticContentEffectsStyles,
          this.staticContentEffects,
          initPositioning && Object.keys(initPositioning).length !== 0
            ? initPositioning
            : {
                position: {
                  left: 50,
                  top: 50,
                },
                scale: {
                  x: 25,
                  y: 25,
                },
                rotation: 0,
              },
          this.videoSocket,
        );
    }
  };

  private onVideoUploadedToTabled = (message: onVideoUploadedToTabledType) => {
    const { contentId } = message.header;
    const { filename, mimeType, state } = message.data;

    if (this.videoSocket.current) {
      this.staticContentMedia.current.video.table[contentId] =
        new TableVideoMedia(
          contentId,
          filename,
          mimeType,
          state,
          this.staticContentEffects,
        );
    }
  };

  private onContentReuploaded = (message: onContentReuploadedType) => {
    const { contentId, contentType } = message.header;

    if (contentType === "svg" || contentType === "image") {
      this.staticContentMedia.current[contentType].table[
        contentId
      ].reloadContent();
    }
  };
}

export default VideoSocketController;
