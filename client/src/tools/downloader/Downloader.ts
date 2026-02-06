import {
  IncomingTableStaticContentMessages,
  onChunkErrorType,
  onChunkType,
  onDownloadErrorType,
  onDownloadMetaType,
  onOneShotDownloadType,
} from "../../serverControllers/tableStaticContentServer/lib/typeConstant";
import {
  StaticContentTypes,
  StaticMimeTypes,
} from "../../../../universal/contentTypeConstant";
import { DownloadSignals } from "../../context/uploadDownloadContext/lib/typeConstant";
import TableStaticContentSocketController from "../../serverControllers/tableStaticContentServer/TableStaticContentSocketController";
import { DownloadListenerTypes } from "./lib/typeConstant";
import UserStaticContentSocketController from "../../serverControllers/userStaticContentServer/UserStaticContentSocketController";
import { IncomingUserStaticContentMessages } from "../../serverControllers/userStaticContentServer/lib/typeConstant";

class Downloader {
  private _paused: boolean = false;

  private fileSize = 0;
  private offset = 0;
  private totalBuffer: Uint8Array | undefined;

  private _progress: number = 0;

  private startTime: number = 0;
  private downloadSpeedHistory: { time: number; speedKBps: number }[] = [];
  private downloadAbsoluteSpeedHistory: { time: number; speedKBps: number }[] =
    [];
  private lastTimestamp: number | null = null;
  private bytesSinceLast: number = 0;

  private listeners: Set<(message: DownloadListenerTypes) => void> = new Set();

  private downloadWorker: Worker | undefined;

  constructor(
    private contentType: StaticContentTypes,
    private contentId: string,
    public filename: string,
    public mimeType: StaticMimeTypes,
    private staticContentSocket: React.MutableRefObject<
      | TableStaticContentSocketController
      | UserStaticContentSocketController
      | undefined
    >,
    private sendDownloadSignal: (signal: DownloadSignals) => void,
    private removeCurrentDownload: (id: string) => void,
  ) {
    this.staticContentSocket.current?.addMessageListener(this.downloadListener);
  }

  deconstructor = () => {
    this.staticContentSocket.current?.removeMessageListener(
      this.downloadListener,
    );
    this.listeners.clear();

    if (this.downloadWorker) {
      this.downloadWorker.terminate();
      this.downloadWorker = undefined;
    }
  };

  private onDownloadMeta = (message: onDownloadMetaType) => {
    const { contentType, contentId } = message.header;

    if (contentType !== this.contentType || contentId !== this.contentId) {
      return;
    }

    this.fileSize = message.data.fileSize;
    this.totalBuffer = new Uint8Array(this.fileSize);

    this.requestNextChunk();
  };

  private requestNextChunk = () => {
    if (this.offset < this.fileSize)
      this.staticContentSocket.current?.getChunk(
        this.contentType,
        this.contentId,
        `bytes=${this.offset}-${Math.min(this.fileSize, this.offset + 1024 * 1024)}`,
      );
  };

  private onChunk = (message: onChunkType) => {
    const { contentType, contentId } = message.header;

    if (contentType !== this.contentType || contentId !== this.contentId) {
      return;
    }

    const now = Date.now();
    const chunkData = message.data.chunk;
    const chunkBytes = chunkData.byteLength;

    this.offset += chunkBytes;
    this._progress = this.offset / (this.fileSize ?? 1);

    // 1) Append chunk as before
    this.totalBuffer?.set(chunkData, this.offset - chunkBytes);

    // 2) Initialize timing on first chunk
    if (this.lastTimestamp === null) {
      this.lastTimestamp = now;
      this.bytesSinceLast = 0;
    }

    // 3) Accumulate bytes
    this.bytesSinceLast += chunkBytes;

    // 4) Every ~200ms, compute instant speed
    if (now - this.lastTimestamp >= 200) {
      const intervalSec = (now - this.lastTimestamp) / 1000;
      const instantKBps = this.bytesSinceLast / 1024 / intervalSec;

      // 5) Store in history
      this.downloadSpeedHistory.push({
        time: now - this.startTime,
        speedKBps: instantKBps,
      });
      this.downloadAbsoluteSpeedHistory.push({
        time: now,
        speedKBps: instantKBps,
      });

      // 6) Reset counters
      this.lastTimestamp = now;
      this.bytesSinceLast = 0;
    }

    this.listeners.forEach((listener) => {
      listener({
        type: "downloadProgress",
      });
    });

    if (!this._paused) {
      if (this.offset < this.fileSize) {
        this.requestNextChunk();
      } else {
        this.downloadWorker = new Worker(
          new URL("../../webWorkers/downloadWorker.worker.ts", import.meta.url),
        );

        this.downloadWorker.onmessage = (e) => {
          const blob = e.data.blob;

          this.listeners.forEach((listener) => {
            listener({
              type: "downloadFinish",
              data: { blob, fileSize: this.fileSize },
            });
          });

          if (this.downloadWorker) {
            this.downloadWorker.terminate();
            this.downloadWorker = undefined;
          }

          this.removeCurrentDownload(this.contentId);
          this.sendDownloadSignal({ type: "downloadFinish" });
          this.deconstructor();
        };

        const bufferToSend = this.totalBuffer?.buffer;
        this.downloadWorker.postMessage(
          { buffer: bufferToSend, mimeType: this.mimeType },
          [bufferToSend!],
        );
      }
    }
  };

  private onChunkError = (message: onChunkErrorType) => {
    const { contentType, contentId } = message.header;

    if (contentType !== this.contentType || contentId !== this.contentId) {
      return;
    }

    this.requestNextChunk();
  };

  private onOneShotDownloadComplete = (message: onOneShotDownloadType) => {
    const { contentType, contentId } = message.header;

    if (contentType !== this.contentType || contentId !== this.contentId) {
      return;
    }

    const { buffer } = message.data;

    const blob = new Blob([buffer], {
      type: this.mimeType,
    });

    const finishMessage = {
      type: "downloadFinish",
      data: { blob, fileSize: this.fileSize },
    };
    this.listeners.forEach((listener) => {
      listener(
        finishMessage as {
          type: "downloadFinish";
          data: { blob: Blob; fileSize: number };
        },
      );
    });

    this.removeCurrentDownload(this.contentId);

    this.sendDownloadSignal({ type: "downloadFinish" });

    this.deconstructor();
  };

  private onDownloadError = (message: onDownloadErrorType) => {
    const { contentType, contentId } = message.header;

    if (contentType !== this.contentType || contentId !== this.contentId) {
      return;
    }

    this.listeners.forEach((listener) => {
      listener({
        type: "downloadFailed",
      });
    });

    this.removeCurrentDownload(this.contentId);

    this.sendDownloadSignal({ type: "downloadError" });

    this.deconstructor();
  };

  private downloadListener = (
    message:
      | IncomingTableStaticContentMessages
      | IncomingUserStaticContentMessages,
  ) => {
    console.log(message);
    switch (message.type) {
      case "downloadMeta":
        this.onDownloadMeta(message);
        break;
      case "chunk":
        this.onChunk(message);
        break;
      case "chunkError":
        this.onChunkError(message);
        break;
      case "oneShotDownload":
        this.onOneShotDownloadComplete(message);
        break;
      case "downloadError":
        this.onDownloadError(message);
        break;
      default:
        break;
    }
  };

  cancel = () => {
    this.removeCurrentDownload(this.contentId);

    this.sendDownloadSignal({ type: "downloadCancel" });

    this.listeners.forEach((listener) => {
      listener({
        type: "downloadFailed",
      });
    });

    this.deconstructor();
  };

  start = () => {
    this._paused = false;

    this.sendDownloadSignal({ type: "downloadStart" });

    this.staticContentSocket.current?.getFile(this.contentType, this.contentId);

    this.startTime = Date.now();
  };

  pause = () => {
    if (this._paused) return;

    this._paused = true;

    this.listeners.forEach((listener) => {
      listener({
        type: "downloadPaused",
      });
    });
  };

  resume = () => {
    if (!this._paused) return;

    this._paused = false;

    this.listeners.forEach((listener) => {
      listener({
        type: "downloadResumed",
      });
    });

    this.requestNextChunk();
  };

  addDownloadListener = (
    listener: (message: DownloadListenerTypes) => void,
  ): void => {
    this.listeners.add(listener);
  };

  removeDownloadListener = (
    listener: (message: DownloadListenerTypes) => void,
  ): void => {
    this.listeners.delete(listener);
  };

  public get paused(): boolean {
    return this._paused;
  }

  public get progress(): number {
    return this._progress;
  }

  getFileInfo = (): {
    mimeType: string;
    fileSize: string;
    downloadSpeed: { time: number; speedKBps: number }[];
    ETA: string;
  } => {
    let ETA = "";

    if (
      !this._paused &&
      this.downloadSpeedHistory.length > 0 &&
      this._progress > 0
    ) {
      const totalSpeed = this.downloadSpeedHistory.reduce(
        (sum, entry) => sum + entry.speedKBps,
        0,
      );
      const avgSpeed = totalSpeed / this.downloadSpeedHistory.length;

      if (avgSpeed > 0) {
        const remainingBytes = this.fileSize - this.offset;
        const remainingSeconds = remainingBytes / 1024 / avgSpeed;

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = Math.floor(remainingSeconds % 60);

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        ETA = parts.join(" ");
      }
    }

    return {
      mimeType: this.mimeType,
      fileSize: this.formatBytes(this.fileSize),
      downloadSpeed: [...this.downloadSpeedHistory],
      ETA,
    };
  };

  getAbsoluteSpeedHistory = (): { time: number; speedKBps: number }[] => {
    return [...this.downloadAbsoluteSpeedHistory];
  };

  private formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
}

export default Downloader;
