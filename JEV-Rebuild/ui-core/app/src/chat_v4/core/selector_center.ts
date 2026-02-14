import { useChatStore } from "../store/chatStore";

export function useSelector(path: string) {
  const chatStore = useChatStore();
  
  switch (path) {
    case "chat.messages":
      return chatStore.messages;
    case "chat.chats":
      return chatStore.chats;
    case "chat.selectedChatId":
      return chatStore.selectedChatId;
    case "chat.messageVersion":
      return chatStore.messageVersion;
    case "chat.chatVersion":
      return chatStore.chatVersion;
    case "chat.selectedMessageId":
      return chatStore.selectedMessageId;
    case "chat.translations":
      return chatStore.translations;
    case "chat.ocr":
      return chatStore.ocr;
    default:
      console.warn("[UNKNOWN_SELECTOR_PATH]", path);
      return undefined;
  }
}
