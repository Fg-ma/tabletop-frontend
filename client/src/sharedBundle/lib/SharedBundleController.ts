import { IncomingVideoMessages } from "src/serverControllers/videoServer/lib/typeConstant";
import { IncomingTableStaticContentMessages } from "../../serverControllers/tableStaticContentServer/lib/typeConstant";
import SharedBundleSocket from "./SharedBundleSocket";
import { IncomingMessages } from "src/serverControllers/gamesServer/lib/typeConstant";

class SharedBundleController extends SharedBundleSocket {
  constructor(
    private setRerender: React.Dispatch<React.SetStateAction<boolean>>,
  ) {
    super();
  }

  gameSignalingListener = (event: IncomingMessages) => {
    switch (event.type) {
      case "gameClosed":
        this.setRerender((prev) => !prev);
        break;
      case "userJoinedTable":
        this.setRerender((prev) => !prev);
        break;
      case "gameInitiated":
        setTimeout(() => {
          this.setRerender((prev) => !prev);
        }, 500);
        break;
      default:
        break;
    }
  };

  handleTableStaticContentMessage = (
    message: IncomingTableStaticContentMessages,
  ) => {
    switch (message.type) {
      case "responsedCatchUpTableData":
        setTimeout(() => {
          this.setRerender((prev) => !prev);
        }, 100);
        break;
      case "imageUploadedToTable":
        this.setRerender((prev) => !prev);
        break;
      case "imageUploadedToTabled":
        this.setRerender((prev) => !prev);
        break;
      case "svgUploadedToTable":
        this.setRerender((prev) => !prev);
        break;
      case "svgUploadedToTabled":
        this.setRerender((prev) => !prev);
        break;
      case "contentReuploaded":
        this.setRerender((prev) => !prev);
        break;
      case "textUploadedToTable":
        this.setRerender((prev) => !prev);
        break;
      case "textUploadedToTabled":
        this.setRerender((prev) => !prev);
        break;
      case "contentDeleted":
        this.setRerender((prev) => !prev);
        break;
      case "createdNewInstances":
        this.setRerender((prev) => !prev);
        break;
      default:
        break;
    }
  };

  handleVideoSocketMessage = (message: IncomingVideoMessages) => {
    switch (message.type) {
      case "videoUploadedToTable":
        this.setRerender((prev) => !prev);
        break;
      case "videoUploadedToTabled":
        this.setRerender((prev) => !prev);
        break;
      default:
        break;
    }
  };
}

export default SharedBundleController;
