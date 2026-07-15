// Binds WebController to the generic chat panel — the panel itself (message
// list, request detail, input row) and the MicButton live in
// @tamedtable/chat-panel. Only app copy (empty state, help lines) and the
// voice wiring stay here.
import type { ReactNode } from 'react';
import { typography } from '@tamedtable/ui-kit';
import { useTheme } from '@tamedtable/ui-kit/components';
import { ChatPanel, MicButton, WaveButton } from '@tamedtable/chat-panel/components';
import { STAY_REPLAY_HINT } from '../controller-messages.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

const HELP_LINES = [
  'Double-click a cell to edit it',
  'Drag a column header to reorder',
  'Undo and Redo live in the toolbar',
  'Save rows or the flow from the toolbar',
];

function EmptyChat(): ReactNode {
  const t = useTheme();
  return (
    <p
      style={{
        margin: 0,
        color: t.ink3,
        fontFamily: typography.ui,
        fontSize: typography.size.sm,
        lineHeight: 1.6,
      }}
    >
      <span style={{ color: t.ink2, fontWeight: 500, fontSize: typography.size.base }}>
        Load a table to begin.
      </span>
      <br />
      Pick a sample, open a local file, or paste a URL with{' '}
      <em style={{ color: t.ink2, fontStyle: 'normal' }}>Open sample…</em> — then
      describe a change in plain English, e.g. “normalize phone numbers” or “drop duplicate
      emails”. Requests are additive; use Undo to revert.
    </p>
  );
}

export function ChatSidebar({
  controller,
  fill = false,
}: {
  controller: WebController;
  fill?: boolean;
}): ReactNode {
  useController(controller);
  return (
    <ChatPanel
      fill={fill}
      inputId="tutorial-chat-input"
      messages={controller.messages}
      streaming={controller.streaming}
      requestCount={controller.history().length}
      prefill={controller.tutorialPrefill}
      // Staying in a finished tour: the cassette can't answer new requests, so
      // the input row greys out (mic hidden) with the replay hint instead.
      disabledHint={controller.isTutorialStayed() ? STAY_REPLAY_HINT : null}
      onSend={(text) => void controller.sendChat(text)}
      onCancel={() => controller.cancelRequest()}
      onReportBug={(m) => void controller.reportMessageBug(m.id)}
      emptyState={<EmptyChat />}
      helpLines={HELP_LINES}
      micButton={
        controller.voiceAvailable() ? (
          <>
            <MicButton
              id="tutorial-speak"
              status={controller.voiceStatus}
              onStart={() => void controller.startVoice()}
              onLatch={() => controller.latchVoice()}
              onStop={() => void controller.stopVoice()}
              onCancel={() => controller.cancelVoice()}
            />
            {controller.continuousAvailable() ? (
              <WaveButton
                status={controller.continuousStatus}
                onToggle={() => void controller.toggleContinuous()}
              />
            ) : null}
          </>
        ) : null
      }
    />
  );
}
