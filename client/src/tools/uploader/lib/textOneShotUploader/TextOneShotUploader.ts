import * as Y from "yjs";
import { GeneralSignals } from "../../../../context/signalContext/lib/typeConstant";

class TextOneShotUploader {
  constructor(
    private tableId: React.MutableRefObject<string>,
    private sendGeneralSignal: (signal: GeneralSignals) => void,
  ) {}

  handleOneShotFileUpload = async (
    file: File,
    metadata: Object,
    baseUrl: string,
  ) => {
    try {
      const text = await file.text();
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText("monaco");

      ytext.insert(0, text);

      const update = Y.encodeStateAsUpdate(ydoc);

      const formData = new FormData();
      formData.append("metadata", JSON.stringify(metadata));
      formData.append(
        "file",
        new Blob([update], { type: "application/octet-stream" }),
      );

      const xhr = new XMLHttpRequest();

      xhr.open("POST", baseUrl + `upload-one-shot-file`, true);

      xhr.setRequestHeader("X-Table-Id", this.tableId.current);

      xhr.onload = () => {
        if (xhr.status === 413) {
          this.sendGeneralSignal({
            type: "tableInfoSignal",
            data: {
              message: `${file.name} exceeds upload size limit`,
              timeout: 3500,
            },
          });
        }
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Error sending metadata:", error);
    }
  };
}

export default TextOneShotUploader;
