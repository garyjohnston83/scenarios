import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Textarea,
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { postMessageRequest, postEventRequest } from '../../store/scenariosSlice';
import type { ReviewApprovalData } from '../../store/scenariosSlice';
import { formatDate } from '../../utils/formatDate';
import styles from './ReviewApprovalSection.module.scss';

interface ReviewApprovalSectionProps {
  data: ReviewApprovalData;
  scenarioId: string;
}

/**
 * Determines which action buttons are enabled based on the current workflow state.
 */
function getButtonEnabledState(workflowState: string): {
  signoff: boolean;
  recall: boolean;
  reject: boolean;
} {
  switch (workflowState) {
    case 'DRAFT':
    case 'IMPACT_PENDING':
      return { signoff: false, recall: true, reject: true };
    case 'IMPACT_AVAILABLE':
    case 'SIGNOFF_IN_PROGRESS':
      return { signoff: true, recall: true, reject: true };
    case 'SIGNED_OFF':
    case 'PROMOTED':
    case 'REJECTED':
      return { signoff: false, recall: false, reject: false };
    default:
      return { signoff: false, recall: false, reject: false };
  }
}

export const ReviewApprovalSection: React.FC<ReviewApprovalSectionProps> = ({
  data,
  scenarioId,
}) => {
  const dispatch = useAppDispatch();
  const messagePosting = useAppSelector(
    (state) => state.scenarios.messagePosting
  );
  const messagePostError = useAppSelector(
    (state) => state.scenarios.messagePostError
  );
  const eventPosting = useAppSelector((state) => state.scenarios.eventPosting);

  const [messageText, setMessageText] = useState('');
  const prevMessagePosting = useRef(messagePosting);

  // Dialog state for Recall
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [recallMessage, setRecallMessage] = useState('');

  // Dialog state for Reject
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');

  useEffect(() => {
    if (prevMessagePosting.current && !messagePosting && !messagePostError) {
      setMessageText('');
    }
    prevMessagePosting.current = messagePosting;
  }, [messagePosting, messagePostError]);

  const handleSend = () => {
    if (messageText.trim() && !messagePosting) {
      dispatch(postMessageRequest({ scenarioId, text: messageText.trim() }));
    }
  };

  const handleSignoff = () => {
    dispatch(postEventRequest({ scenarioId, type: 'SIGNOFF' }));
  };

  const handleRecallConfirm = () => {
    dispatch(
      postEventRequest({ scenarioId, type: 'RECALL', message: recallMessage })
    );
    setRecallDialogOpen(false);
    setRecallMessage('');
  };

  const handleRejectConfirm = () => {
    dispatch(
      postEventRequest({ scenarioId, type: 'REJECT', message: rejectMessage })
    );
    setRejectDialogOpen(false);
    setRejectMessage('');
  };

  const { workflow, messages, events } = data;
  const buttonEnabled = getButtonEnabledState(workflow.workflowState);

  return (
    <div className={styles.section}>
      {/* Workflow Status */}
      <div className={styles.subsection}>
        <span className={styles.sectionHeading}>Workflow Status</span>
        <div className={styles.workflowRow}>
          <span className={styles.workflowLabel}>
            {workflow.workflowStateLabel}
          </span>
          <span className={styles.progressText}>
            Step {workflow.progress.current} of {workflow.progress.total}
          </span>
        </div>
        {data.approvalsReceived != null && data.approvalsRequired != null && (
          <div className={styles.approvalProgress}>
            Approvals received {data.approvalsReceived} of{' '}
            {data.approvalsRequired}
          </div>
        )}
      </div>

      <div className={styles.divider} />

      {/* Messages */}
      <div className={styles.subsection}>
        <span className={styles.sectionHeading}>Messages</span>
        {messages.length === 0 ? (
          <span className={styles.emptyState}>No messages</span>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div key={msg.id} className={styles.messageItem}>
                <div className={styles.messageHeader}>
                  <span className={styles.authorName}>
                    {msg.authorDisplayName}
                  </span>
                  <span className={styles.timestamp}>
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <span className={styles.messageText}>{msg.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.composerArea}>
          <Textarea
            className={styles.composerInput}
            placeholder="Type a message..."
            value={messageText}
            onChange={(_e, data) => setMessageText(data.value)}
            resize="vertical"
          />
          <div className={styles.composerButtons}>
            <div className={styles.composerButtonsTopRow}>
              <Button
                className={styles.btnSend}
                disabled={!messageText.trim() || messagePosting}
                onClick={handleSend}
                icon={messagePosting ? <Spinner size="tiny" /> : undefined}
              >
                Send
              </Button>
              <Button
                className={styles.btnSignoff}
                disabled={!buttonEnabled.signoff || eventPosting}
                onClick={handleSignoff}
              >
                Sign-off
              </Button>
            </div>
            <div className={styles.composerButtonsBottomRow}>
              <Dialog
                open={recallDialogOpen}
                onOpenChange={(_event, data) => {
                  setRecallDialogOpen(data.open);
                  if (!data.open) setRecallMessage('');
                }}
              >
                <DialogTrigger disableButtonEnhancement>
                  <Button
                    className={styles.btnRecall}
                    disabled={!buttonEnabled.recall || eventPosting}
                  >
                    Recall
                  </Button>
                </DialogTrigger>
                <DialogSurface>
                  <DialogBody>
                    <DialogTitle>Recall Scenario</DialogTitle>
                    <DialogContent>
                      <Textarea
                        placeholder="Enter reason for recall..."
                        value={recallMessage}
                        onChange={(_e, data) => setRecallMessage(data.value)}
                        resize="vertical"
                        style={{ width: '100%' }}
                      />
                    </DialogContent>
                    <DialogActions>
                      <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary">Cancel</Button>
                      </DialogTrigger>
                      <Button
                        appearance="primary"
                        disabled={!recallMessage.trim()}
                        onClick={handleRecallConfirm}
                      >
                        Confirm Recall
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </DialogSurface>
              </Dialog>

              <Dialog
                open={rejectDialogOpen}
                onOpenChange={(_event, data) => {
                  setRejectDialogOpen(data.open);
                  if (!data.open) setRejectMessage('');
                }}
              >
                <DialogTrigger disableButtonEnhancement>
                  <Button
                    className={styles.btnReject}
                    disabled={!buttonEnabled.reject || eventPosting}
                  >
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogSurface>
                  <DialogBody>
                    <DialogTitle>Reject Scenario</DialogTitle>
                    <DialogContent>
                      <Textarea
                        placeholder="Enter reason for rejection..."
                        value={rejectMessage}
                        onChange={(_e, data) => setRejectMessage(data.value)}
                        resize="vertical"
                        style={{ width: '100%' }}
                      />
                    </DialogContent>
                    <DialogActions>
                      <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary">Cancel</Button>
                      </DialogTrigger>
                      <Button
                        appearance="primary"
                        disabled={!rejectMessage.trim()}
                        onClick={handleRejectConfirm}
                      >
                        Confirm Reject
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </DialogSurface>
              </Dialog>
            </div>
          </div>
        </div>
        {messagePostError && (
          <span className={styles.errorText}>{messagePostError}</span>
        )}
      </div>

      <div className={styles.divider} />

      {/* Events */}
      <div className={styles.subsection}>
        <span className={styles.sectionHeading}>Events</span>
        {events.length === 0 ? (
          <span className={styles.emptyState}>No events</span>
        ) : (
          <div className={styles.eventsList}>
            {events.map((evt) => (
              <div key={evt.id} className={styles.eventItem}>
                <span className={styles.eventLabel}>{evt.eventLabel}</span>
                <div className={styles.eventMeta}>
                  <span className={styles.actorName}>
                    {evt.actorDisplayName}
                  </span>
                  <span className={styles.timestamp}>
                    {formatDate(evt.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.divider} />

      {/* Export Stub */}
      <div className={styles.subsection}>
        <Button
          appearance="outline"
          onClick={() => alert('Not implemented')}
        >
          Export History
        </Button>
      </div>
    </div>
  );
};

export default ReviewApprovalSection;
