// components/companion/CompanionChat.tsx
// Messenger-artige Chat-UI fuer den KI-Quartier-Lotsen
// Duenner Container: Logik in useCompanionChat, Rendering in Sub-Komponenten

'use client';

import { useCompanionChat } from './hooks/useCompanionChat';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputArea } from './ChatInputArea';

export function CompanionChat() {
  const {
    messages,
    inputValue,
    setInputValue,
    sending,
    confirmLoading,
    recording,
    speechState,
    isStreaming,
    streamingText,
    messagesEndRef,
    inputRef,
    handleSend,
    handleConfirmTool,
    handleCancelTool,
    toggleRecording,
    handleKeyDown,
  } = useCompanionChat();

  return (
    <div className="flex h-full flex-col" data-testid="companion-chat">
      <ChatHeader />

      <ChatMessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingText={streamingText}
        sending={sending}
        confirmLoading={confirmLoading}
        messagesEndRef={messagesEndRef}
        onConfirmTool={handleConfirmTool}
        onCancelTool={handleCancelTool}
      />

      <ChatInputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        sending={sending}
        recording={recording}
        speechState={speechState}
        inputRef={inputRef}
        onSend={() => handleSend()}
        onToggleRecording={toggleRecording}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
