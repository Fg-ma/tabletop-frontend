import { v4 as uuidv4 } from "uuid";
import { GeneralSignals } from "../../context/signalContext/lib/typeConstant";
import { UploadSignals } from "../../context/uploadDownloadContext/lib/typeConstant";
import OneShotUploader from "./lib/oneShotUploader/OneShotUploader";
import ChunkUploader from "./lib/chunkUploader/ChunkUploader";
import {
  mimeTypeContentTypeMap,
  StaticMimeTypes,
  TableContentStateTypes,
  UserContentStateTypes,
} from "../../../../universal/contentTypeConstant";
import IndexedDB from "../../db/indexedDB/IndexedDB";
import ReasonableFileSizer from "../reasonableFileSizer.ts/ReasonableFileSizer";
import TextChunkUploader from "./lib/textChunkUploader/TextChunkUploader";
import TextOneShotUploader from "./lib/textOneShotUploader/TextOneShotUploader";
import VideoChunkUploader from "./lib/videoChunkUploader/VideoChunkUploader";
import VideoSocketController from "../../serverControllers/videoServer/VideoSocketController";
import TableStaticContentSocketController from "../../serverControllers/tableStaticContentServer/TableStaticContentSocketController";

const tableStaticContentServerIp = process.env.TABLE_STATIC_CONTENT_SERVER_IP;
const tableStaticContentServerPort =
  process.env.TABLE_STATIC_CONTENT_SERVER_PORT;
const userStaticContentServerBaseUrl =
  process.env.USER_STATIC_CONTENT_SERVER_BASE_URL;
const videoServerBaseUrl = process.env.VIDEO_SERVER_BASE_URL;

export type TableUploadDirections = "toTable" | "reupload" | "toTabled";

class Uploader {
  private UPLOAD_SIZE_LIMIT = 1024 * 1024 * 1024;
  private VIDEO_UPLOAD_SIZE_LIMIT = 1024 * 1024 * 100;
  private ONE_SHOT_FILE_SIZE_CUTOFF = 1024 * 1024 * 40;

  private oneShotUploader: OneShotUploader;
  private textOneShotUploader: TextOneShotUploader;

  constructor(
    private tableStaticContentSocket: React.MutableRefObject<
      TableStaticContentSocketController | undefined
    >,
    private videoSocket: React.MutableRefObject<
      VideoSocketController | undefined
    >,
    private tableId: React.MutableRefObject<string>,
    private username: React.MutableRefObject<string>,
    private instance: React.MutableRefObject<string>,
    private userId: React.MutableRefObject<string>,
    private sendUploadSignal: (signal: UploadSignals) => void,
    private addCurrentUpload: (
      id: string,
      upload: ChunkUploader | TextChunkUploader | VideoChunkUploader,
    ) => void,
    private removeCurrentUpload: (id: string) => void,
    private reasonableFileSizer: React.MutableRefObject<ReasonableFileSizer>,
    private indexedDBController: React.MutableRefObject<IndexedDB>,
    private sendGeneralSignal: (signal: GeneralSignals) => void,
  ) {
    this.oneShotUploader = new OneShotUploader(
      this.tableId,
      this.sendGeneralSignal,
    );
    this.textOneShotUploader = new TextOneShotUploader(
      this.tableId,
      this.sendGeneralSignal,
    );
  }

  uploadToTable = async (
    file: File,
    state: TableContentStateTypes[] = [],
    initPositioning?: {
      position: { top: number; left: number };
      scale: { x: number; y: number };
      rotation: number;
    },
    handle?: FileSystemFileHandle,
    uploadId?: string,
    contentId?: string,
    offset = 0,
  ) => {
    if (
      file.size > this.UPLOAD_SIZE_LIMIT ||
      (file.type.startsWith("video/") &&
        file.size > this.VIDEO_UPLOAD_SIZE_LIMIT)
    ) {
      this.sendGeneralSignal({
        type: "tableInfoSignal",
        data: {
          message: `${file.name} exceeds upload size limit`,
          timeout: 2500,
        },
      });
      return;
    }

    if (!this.tableId.current) return;

    if (file.size < this.ONE_SHOT_FILE_SIZE_CUTOFF) {
      this.sendGeneralSignal({
        type: "tableInfoSignal",
        data: {
          message: `Uploading ${file.name}...`,
          timeout: 2500,
        },
      });

      if (file.type.startsWith("text/")) {
        this.textOneShotUploader.handleOneShotFileUpload(
          file,
          {
            tableId: this.tableId.current,
            contentId: contentId !== undefined ? contentId : uuidv4(),
            instanceId: uuidv4(),
            direction: "toTable",
            state,
            initPositioning,
            mimeType: file.type,
            filename: file.name,
          },
          `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/`,
        );
      } else {
        this.oneShotUploader.handleOneShotFileUpload(
          file,
          {
            tableId: this.tableId.current,
            contentId: contentId !== undefined ? contentId : uuidv4(),
            instanceId: uuidv4(),
            direction: "toTable",
            state,
            initPositioning,
            mimeType: file.type,
            filename: file.name,
            ...(file.type.startsWith("video/")
              ? {
                  username: this.username.current,
                  instance: this.instance.current,
                }
              : {}),
          },
          file.type.startsWith("video/")
            ? videoServerBaseUrl!
            : `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/`,
          file.type.startsWith("video/") ? false : true,
        );
      }
    } else {
      const finalContentId = contentId !== undefined ? contentId : uuidv4();

      if (uploadId) {
        this.sendGeneralSignal({
          type: "tableInfoSignal",
          data: {
            message: `Attempting to resume ${file.name} upload...`,
            timeout: 2500,
          },
        });
      } else {
        this.sendGeneralSignal({
          type: "tableInfoSignal",
          data: {
            message: `Uploading ${file.name} this may take a second...`,
            timeout: 2500,
          },
        });
      }

      const metadata = {
        tableId: this.tableId.current,
        contentId: finalContentId,
        instanceId: uuidv4(),
        direction: "toTable",
        state,
        filename: file.name,
        mimeType: file.type,
        initPositioning,
      };

      if (file.type.startsWith("video/")) {
        Object.assign(metadata, {
          username: this.username.current,
          instance: this.instance.current,
        });
      }

      try {
        let finalUploadId = uploadId;

        if (uploadId === undefined) {
          const metaRes = await fetch(
            file.type.startsWith("video/")
              ? videoServerBaseUrl + "upload-chunk-meta"
              : `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/` +
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

          if (!metaRes.ok) return;

          const { uploadId: newUploadId } = await metaRes.json();

          finalUploadId = newUploadId;
        }

        if (!finalUploadId) return;

        if (handle) {
          await this.indexedDBController.current.uploadPosts?.saveFileHandle(
            finalContentId,
            this.tableId.current,
            finalUploadId,
            mimeTypeContentTypeMap[file.type as StaticMimeTypes],
            handle,
            offset,
          );
        }

        setTimeout(
          () =>
            this.sendUploadSignal({
              type: "uploadStart",
            }),
          250,
        );

        let uploader: ChunkUploader | TextChunkUploader | VideoChunkUploader;

        if (file.type.startsWith("text/")) {
          uploader = new TextChunkUploader(
            this.tableStaticContentSocket,
            this.tableId,
            file,
            finalUploadId,
            finalContentId,
            this.removeCurrentUpload,
            this.sendUploadSignal,
            this.reasonableFileSizer,
            this.indexedDBController,
            "toTable",
            handle,
            offset,
            this.sendGeneralSignal,
            initPositioning,
            state,
          );
        } else if (file.type.startsWith("video/")) {
          uploader = new VideoChunkUploader(
            this.videoSocket,
            this.tableId,
            this.username,
            this.instance,
            file,
            finalUploadId,
            finalContentId,
            this.removeCurrentUpload,
            this.sendUploadSignal,
            this.reasonableFileSizer,
            this.indexedDBController,
            "toTable",
            handle,
            offset,
            this.sendGeneralSignal,
            initPositioning,
            state,
          );
        } else {
          uploader = new ChunkUploader(
            this.tableStaticContentSocket,
            this.tableId,
            file,
            finalUploadId,
            finalContentId,
            this.removeCurrentUpload,
            this.sendUploadSignal,
            this.reasonableFileSizer,
            this.indexedDBController,
            "toTable",
            handle,
            offset,
            this.sendGeneralSignal,
            initPositioning,
            state,
          );
        }
        this.addCurrentUpload(finalContentId, uploader);
        uploader.start();
      } catch (error) {
        console.error("Error sending metadata:", error);
      }
    }
  };

  reuploadTableContent = async (file: File, contentId: string) => {
    if (file.size > this.UPLOAD_SIZE_LIMIT) {
      this.sendGeneralSignal({
        type: "tableInfoSignal",
        data: {
          message: `${file.name} exceeds upload size limit`,
          timeout: 2500,
        },
      });
      return;
    }

    if (file.size < this.ONE_SHOT_FILE_SIZE_CUTOFF) {
      this.oneShotUploader.handleOneShotFileUpload(
        file,
        {
          tableId: this.tableId.current,
          contentId,
          direction: "reupload",
          mimeType: file.type,
          filename: file.name,
        },
        `https://${tableStaticContentServerIp}:${tableStaticContentServerPort}/`,
      );
    } else {
      const metadata = {
        tableId: this.tableId.current,
        contentId,
        direction: "reupload",
        mimeType: file.type,
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
          if (metaRes.status === 409) {
            this.sendGeneralSignal({
              type: "tableInfoSignal",
              data: {
                message: "File already reuploading",
                timeout: 2500,
              },
            });
          }
          return;
        }

        const { uploadId } = await metaRes.json();

        if (!uploadId) return;

        setTimeout(
          () =>
            this.sendUploadSignal({
              type: "uploadStart",
            }),
          250,
        );
        const uploader = new ChunkUploader(
          this.tableStaticContentSocket,
          this.tableId,
          file,
          uploadId,
          contentId,
          this.removeCurrentUpload,
          this.sendUploadSignal,
          this.reasonableFileSizer,
          undefined,
          "reupload",
          undefined,
          undefined,
          this.sendGeneralSignal,
          undefined,
          undefined,
        );
        this.addCurrentUpload(contentId, uploader);
        uploader.start();
      } catch (error) {
        console.error("Error sending metadata:", error);
      }
    }
  };

  uploadToMuteStyle = async (
    file: File,
    state: UserContentStateTypes[] = [],
  ) => {
    if (file.size > this.UPLOAD_SIZE_LIMIT) {
      this.sendGeneralSignal({
        type: "tableInfoSignal",
        data: {
          message: `${file.name} exceeds upload size limit`,
          timeout: 2500,
        },
      });
      return;
    }

    if (!userStaticContentServerBaseUrl) return;

    if (file.size < this.ONE_SHOT_FILE_SIZE_CUTOFF) {
      this.oneShotUploader.handleOneShotFileUpload(
        file,
        {
          userId: this.userId.current,
          contentId: uuidv4(),
          instanceId: uuidv4(),
          direction: "toMuteStyle",
          state,
          mimeType: file.type,
          filename: file.name,
        },
        userStaticContentServerBaseUrl,
      );
    } else {
      const contentId = uuidv4();

      const metadata = {
        userId: this.userId.current,
        contentId,
        direction: "toMuteStyle",
        state,
        filename: file.name,
        mimeType: file.type,
      };

      try {
        const metaRes = await fetch(
          userStaticContentServerBaseUrl + "upload-chunk-meta",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Table-Id": this.tableId.current,
            },
            body: JSON.stringify(metadata),
          },
        );

        if (!metaRes.ok) return;

        const { uploadId } = await metaRes.json();

        if (!uploadId) return;

        setTimeout(
          () =>
            this.sendUploadSignal({
              type: "uploadStart",
            }),
          250,
        );
        const uploader = new ChunkUploader(
          this.tableStaticContentSocket,
          this.tableId,
          file,
          uploadId,
          contentId,
          this.removeCurrentUpload,
          this.sendUploadSignal,
          this.reasonableFileSizer,
          undefined,
          "toMuteStyle",
          undefined,
          undefined,
          this.sendGeneralSignal,
          undefined,
          undefined,
        );
        this.addCurrentUpload(contentId, uploader);
        uploader.start();
      } catch (error) {
        console.error("Error sending metadata:", error);
      }
    }
  };
}

export default Uploader;
