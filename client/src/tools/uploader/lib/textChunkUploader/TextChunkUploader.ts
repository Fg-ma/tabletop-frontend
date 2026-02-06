import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import IndexedDB from "../../../../db/indexedDB/IndexedDB";
import { UploadSignals } from "../../../../context/uploadDownloadContext/lib/typeConstant";
import {
  TableContentStateTypes,
  UploadingStateTypes,
} from "../../../../../../universal/contentTypeConstant";
import ReasonableFileSizer from "../../../reasonableFileSizer.ts/ReasonableFileSizer";
import { GeneralSignals } from "../../../../context/signalContext/lib/typeConstant";
import TableStaticContentSocketController from "../../../../serverControllers/tableStaticContentServer/TableStaticContentSocketController";

const tableStaticContentServerIp = process.env.TABLE_STATIC_CONTENT_SERVER_IP;
const tableStaticContentServerPort =
  process.env.TABLE_STATIC_CONTENT_SERVER_PORT;

export type ChunkedUploadListenerTypes =
  | { type: "uploadPaused" }
  | { type: "uploadPlay" }
  | { type: "uploadFailed" }
  | {
      type: "uploadProgress";
      data: { progress: number };
    };

class TextChunkUploader {
  private readonly CHUNK_SIZE = 1024 * 1024 * 5;

  uploadingState: UploadingStateTypes = "uploading";

  private offset: number = 0;

  private _paused: boolean = false;
  private cancelled: boolean = false;
  private currentChunkAbortController: AbortController | null = null;

  readonly filename: string;
  uploadUrl: string | undefined;
  private _progress: number = 0;

  private uploadSpeedHistory: { time: number; speedKBps: number }[] = [];
  private uploadAbsoluteSpeedHistory: { time: number; speedKBps: number }[] =
    [];
  private uploadStartTime: number | null = null;

  private listeners: Set<(message: ChunkedUploadListenerTypes) => void> =
    new Set();

  private ydoc: Y.Doc | undefined;
  private ytext: Y.Text | undefined;
  private fullUpdateUpload: Uint8Array<ArrayBufferLike> | undefined;

  constructor(
    private tableStaticContentSocket: React.MutableRefObject<
      TableStaticContentSocketController | undefined
    >,
    private tableId: React.MutableRefObject<string>,
    public file: File,
    private uploadId: string,
    private contentId: string,
    private removeCurrentUpload: (id: string) => void,
    private sendUploadSignal: (signal: UploadSignals) => void,
    private reasonableFileSizer: React.MutableRefObject<ReasonableFileSizer>,
    private indexedDBController: React.MutableRefObject<IndexedDB> | undefined,
    private direction: string,
    private handle: FileSystemFileHandle | undefined,
    offset: number | undefined,
    private sendGeneralSignal: (signal: GeneralSignals) => void,
    private initPositioning?: {
      position: { top: number; left: number };
      scale: { x: number; y: number };
      rotation: number;
    },
    private state: TableContentStateTypes[] = [],
  ) {
    this.filename = this.file.name;
    if (offset) {
      this.offset = offset;
      this._progress = offset / this.file.size;
    }

    this.init();
  }

  init = async () => {
    this.uploadUrl = await this.reasonableFileSizer?.current.getUrl(this.file);
  };

  deconstructor = async () => {
    if (this.handle) {
      await this.indexedDBController?.current.uploadDeletes?.deleteFileHandle(
        this.contentId,
      );
    }
    if (this.uploadUrl) URL.revokeObjectURL(this.uploadUrl);
    this.removeCurrentUpload(this.contentId);
    this.sendUploadSignal({ type: "uploadFinish" });
    this.listeners.clear();
  };

  cancel = async () => {
    this.cancelled = true;

    if (this.currentChunkAbortController) {
      this.currentChunkAbortController.abort();
      this.currentChunkAbortController = null;
    }

    try {
      await fetch(
        `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/cancel-upload/${this.uploadId}/${this.contentId}/text`,
        {
          method: "POST",
          headers: {
            "X-Table-Id": this.tableId.current,
          },
        },
      );
    } catch (e) {
      console.warn("Failed to notify server of cancellation:", e);
    }

    this.deconstructor();
  };

  start = async () => {
    this._paused = false;
    setTimeout(
      () =>
        this.listeners.forEach((listener) => {
          listener({
            type: "uploadPlay",
          });
        }),
      250,
    );
    await this.uploadLoop();
  };

  pause = () => {
    this._paused = true;

    this.listeners.forEach((listener) => {
      listener({
        type: "uploadPaused",
      });
    });
  };

  resume = () => {
    if (this._paused) {
      this.start();
    }
  };

  private uploadLoop = async () => {
    this.uploadStartTime = Date.now();

    if (!this.ydoc || !this.ytext || !this.fullUpdateUpload) {
      this.ydoc = new Y.Doc();
      this.ytext = this.ydoc.getText("monaco");
      const fullText = await this.file.text();
      this.ytext.insert(0, fullText);
      this.fullUpdateUpload = Y.encodeStateAsUpdate(this.ydoc);
    }

    const totalChunks = Math.ceil(
      this.fullUpdateUpload.length / this.CHUNK_SIZE,
    ).toString();

    while (
      this.offset * this.CHUNK_SIZE < this.fullUpdateUpload.length &&
      !this._paused &&
      !this.cancelled
    ) {
      const end = Math.min(
        (this.offset + 1) * this.CHUNK_SIZE,
        this.fullUpdateUpload.length,
      );
      const chunkIndex = this.offset;
      const chunk = this.fullUpdateUpload.slice(
        this.offset * this.CHUNK_SIZE,
        end,
      );
      this.offset += 1;

      const start = Date.now();

      const formData = new FormData();
      formData.append(
        "chunk",
        new Blob([chunk], { type: "application/octet-stream" }),
      );
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", totalChunks);

      try {
        this.currentChunkAbortController = new AbortController();
        const response = await fetch(
          `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/upload-chunk/${this.uploadId}/${this.contentId}/text`,
          {
            method: "POST",
            body: formData,
            signal: this.currentChunkAbortController.signal,
            headers: {
              "X-Table-Id": this.tableId.current,
            },
          },
        );
        this.currentChunkAbortController = null;

        if (!response.ok) {
          if (response.status === 413) {
            this.sendGeneralSignal({
              type: "tableInfoSignal",
              data: {
                message: `${this.filename} exceeds upload size limit`,
                timeout: 3500,
              },
            });
            this.deconstructor();
            return;
          }
          if (response.status !== 409) {
            this.uploadFailed();
            return;
          }
        }

        if (response.status !== 409) {
          const end = Date.now();
          const durationMs = end - start;
          const speedKBps = this.CHUNK_SIZE / 1024 / (durationMs / 1000);

          this.uploadSpeedHistory.push({
            time: end - (this.uploadStartTime ?? 0),
            speedKBps,
          });
          this.uploadAbsoluteSpeedHistory.push({
            time: end,
            speedKBps,
          });
        }

        this._progress =
          (this.offset * this.CHUNK_SIZE) /
          (this.fullUpdateUpload?.length ?? 1);
        this.listeners.forEach((listener) => {
          listener({
            type: "uploadProgress",
            data: { progress: this._progress },
          });
        });
        if (this.handle) {
          this.indexedDBController?.current.uploadPosts?.updateProgress(
            this.contentId,
            this.offset,
          );
        }
      } catch (error) {
        console.error("Upload failed:", error);
        break;
      }
    }

    if (this.offset * this.CHUNK_SIZE >= this.fullUpdateUpload.length) {
      this.deconstructor();
    }
  };

  private uploadFailed = async () => {
    this.tableStaticContentSocket.current?.deleteUploadSession(
      this.uploadId,
      this.contentId,
      "text",
    );

    this.uploadingState = "failed";

    this._progress = 0;
    this.offset = 0;
    this.uploadSpeedHistory = [];
    this.uploadAbsoluteSpeedHistory = [];

    this.listeners.forEach((listener) => {
      listener({
        type: "uploadProgress",
        data: { progress: this._progress },
      });
    });

    if (this.handle) {
      await this.indexedDBController?.current.uploadDeletes?.deleteFileHandle(
        this.contentId,
      );
    }

    this.listeners.forEach((listener) => {
      listener({
        type: "uploadFailed",
      });
    });
  };

  retryUpload = async () => {
    this.uploadingState = "uploading";

    const metadata = {
      tableId: this.tableId.current,
      contentId: this.contentId,
      instanceId: uuidv4(),
      direction: this.direction,
      state: this.state,
      filename: this.file.name,
      mimeType: this.file.type,
      initPositioning: this.initPositioning,
    };

    try {
      const metaRes = await fetch(
        `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/` +
          "upload-chunk-meta",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Table-Id": this.tableId.current,
          },
          body: JSON.stringify(metadata),
        },
      );

      if (!metaRes.ok) {
        this.deconstructor();
        return;
      }

      const { uploadId } = await metaRes.json();

      if (!uploadId) {
        this.deconstructor();
        return;
      }

      this.uploadId = uploadId;

      if (this.handle) {
        await this.indexedDBController?.current.uploadPosts?.saveFileHandle(
          this.contentId,
          this.tableId.current,
          this.uploadId,
          "text",
          this.handle,
          0,
        );
      }

      setTimeout(
        () =>
          this.sendUploadSignal({
            type: "uploadStart",
          }),
        250,
      );
    } catch (_) {}

    this.uploadLoop();
  };

  addChunkedUploadListener = (
    listener: (message: ChunkedUploadListenerTypes) => void,
  ): void => {
    this.listeners.add(listener);
  };

  removeChunkedUploadListener = (
    listener: (message: ChunkedUploadListenerTypes) => void,
  ): void => {
    this.listeners.delete(listener);
  };

  getFileInfo = (): {
    mimeType: string;
    fileSize: string;
    uploadSpeed: { time: number; speedKBps: number }[];
    ETA: string;
  } => {
    let ETA = "";

    if (
      !this._paused &&
      this.uploadSpeedHistory.length > 0 &&
      this._progress > 0 &&
      this.fullUpdateUpload
    ) {
      const totalSpeed = this.uploadSpeedHistory.reduce(
        (sum, entry) => sum + entry.speedKBps,
        0,
      );
      const avgSpeed = totalSpeed / this.uploadSpeedHistory.length;

      if (avgSpeed > 0) {
        const remainingBytes =
          this.fullUpdateUpload.length - this.offset * this.CHUNK_SIZE;
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
      mimeType: this.file.type || "unknown",
      fileSize: this.formatBytes(this.fullUpdateUpload?.length ?? 0),
      uploadSpeed: [...this.uploadSpeedHistory],
      ETA,
    };
  };

  getAbsoluteSpeedHistory = (): { time: number; speedKBps: number }[] => {
    return [...this.uploadAbsoluteSpeedHistory];
  };

  private formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  public get paused(): boolean {
    return this._paused;
  }

  public get progress(): number {
    return this._progress;
  }
}

export default TextChunkUploader;
