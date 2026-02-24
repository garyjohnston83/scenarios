import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  Textarea,
  Spinner,
  makeStyles,
  tokens,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchScenarioDetailRequest,
  postEventRequest,
  postMessageRequest,
} from '../../store/scenariosSlice';
import { formatDate } from '../../utils/formatDate';
import {
  getWorkflowStateLabel,
  getImpactLabel,
  getRunStatusLabel,
} from '../../utils/labelMappings';
import { DirectChangesSection } from '../DirectChangesSection';
import { ImpactDataSection } from '../ImpactDataSection';
import { ReviewApprovalSection } from '../ReviewApprovalSection';
import styles from './ScenarioDetailPane.module.scss';

const EM_DASH = '\u2014';

const useFluentStyles = makeStyles({
  title: {
    color: tokens.colorNeutralForeground1,
  },
  emptyState: {
    color: tokens.colorNeutralForeground3,
  },
  errorState: {
    color: tokens.colorPaletteRedForeground1,
  },
});

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

export const ScenarioDetailPane: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const fluentStyles = useFluentStyles();

  const selectedDetail = useAppSelector(
    (state) => state.scenarios.selectedDetail
  );
  const detailLoading = useAppSelector(
    (state) => state.scenarios.detailLoading
  );
  const detailError = useAppSelector((state) => state.scenarios.detailError);
  const eventPosting = useAppSelector((state) => state.scenarios.eventPosting);
  const eventPostError = useAppSelector(
    (state) => state.scenarios.eventPostError
  );
  const messagePosting = useAppSelector(
    (state) => state.scenarios.messagePosting
  );

  // Dialog state for Recall
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [recallMessage, setRecallMessage] = useState('');

  // Dialog state for Reject
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');

  // Quick message state (header composer)
  const [quickMessageText, setQuickMessageText] = useState('');
  const prevMessagePosting = useRef(messagePosting);

  useEffect(() => {
    if (prevMessagePosting.current && !messagePosting) {
      setQuickMessageText('');
    }
    prevMessagePosting.current = messagePosting;
  }, [messagePosting]);

  useEffect(() => {
    if (id) {
      dispatch(fetchScenarioDetailRequest(id));
    }
  }, [id, dispatch]);

  if (!id) {
    return (
      <div className={`${styles.container} ${styles.contentPadding}`}>
        <Text
          className={`${styles.title} ${fluentStyles.emptyState}`}
          size={400}
          block
        >
          Select a scenario
        </Text>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className={`${styles.container} ${styles.contentPadding}`}>
        <Text size={400} block>
          Loading...
        </Text>
      </div>
    );
  }

  if (detailError) {
    return (
      <div className={`${styles.container} ${styles.contentPadding}`}>
        <Text className={fluentStyles.errorState} size={400} block>
          Scenario not found
        </Text>
        <Button
          appearance="outline"
          onClick={() => navigate('/scenarios')}
          style={{ marginTop: 12 }}
        >
          Back to scenarios
        </Button>
      </div>
    );
  }

  if (selectedDetail) {
    const { header, summaryCards, directChanges, impactData, reviewApproval } =
      selectedDetail;

    const buttonEnabled = header
      ? getButtonEnabledState(header.workflowState)
      : { signoff: false, recall: false, reject: false };

    const handleSignoff = () => {
      dispatch(
        postEventRequest({ scenarioId: selectedDetail.id, type: 'SIGNOFF' })
      );
    };

    const handleRecallConfirm = () => {
      dispatch(
        postEventRequest({
          scenarioId: selectedDetail.id,
          type: 'RECALL',
          message: recallMessage,
        })
      );
      setRecallDialogOpen(false);
      setRecallMessage('');
    };

    const handleRejectConfirm = () => {
      dispatch(
        postEventRequest({
          scenarioId: selectedDetail.id,
          type: 'REJECT',
          message: rejectMessage,
        })
      );
      setRejectDialogOpen(false);
      setRejectMessage('');
    };

    const handleQuickSend = () => {
      if (quickMessageText.trim() && !messagePosting) {
        dispatch(
          postMessageRequest({
            scenarioId: selectedDetail.id,
            text: quickMessageText.trim(),
          })
        );
      }
    };

    // Summary formatting helpers
    const formatNullableDate = (value: string | null): string =>
      value === null ? EM_DASH : formatDate(value);
    const formatNullableString = (
      value: string | null,
      labelFn?: (v: string) => string
    ): string => {
      if (value === null) return EM_DASH;
      return labelFn ? labelFn(value) : value;
    };
    const formatExceptionsCount = (value: number | null): string =>
      value === null ? EM_DASH : String(value);

    return (
      <div className={styles.container}>
        <div className={styles.stickyHeader}>
          <Text
            className={`${styles.title} ${fluentStyles.title}`}
            size={500}
            weight="semibold"
            block
          >
            Scenario: {selectedDetail.name}
          </Text>

          {/* Three-card header row */}
          <div className={styles.headerCardsRow}>
            {/* Key Details card */}
            <div className={styles.headerCard}>
              <span className={styles.headerCardTitle}>Key Details</span>
              {header && (
                <>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Workflow State</span>
                    <span className={styles.fieldValue}>
                      {getWorkflowStateLabel(header.workflowState)}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Impact</span>
                    <span className={styles.fieldValue}>
                      {getImpactLabel(header.impact)}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Owner</span>
                    <span className={styles.fieldValue}>
                      {header.ownerDisplayName}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Created</span>
                    <span className={styles.fieldValue}>
                      {formatDate(header.createdAt)}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Last Updated</span>
                    <span className={styles.fieldValue}>
                      {formatDate(header.updatedAt)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Changes Summary card */}
            <div className={styles.headerCard}>
              <span className={styles.headerCardTitle}>Changes Summary</span>
              {summaryCards && (
                <>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Total Changes</span>
                    <span className={styles.fieldValue}>
                      {summaryCards.changesSummary.changesTotal}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Direct</span>
                    <span className={styles.fieldValue}>
                      {summaryCards.changesSummary.changesDirect}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Indirect</span>
                    <span className={styles.fieldValue}>
                      {summaryCards.changesSummary.changesIndirect}
                    </span>
                  </div>
                  {summaryCards.changesSummary.cta && (
                    <div className={styles.ctaRow}>
                      <Link
                        href={summaryCards.changesSummary.cta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        appearance="subtle"
                      >
                        {summaryCards.changesSummary.cta.label}
                        <ArrowRightRegular />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Impact Summary card */}
            <div className={styles.headerCard}>
              <span className={styles.headerCardTitle}>Impact Summary</span>
              {summaryCards && (
                <>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Impact</span>
                    <span className={styles.fieldValue}>
                      {getImpactLabel(summaryCards.impactSummary.impact)}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Last Run</span>
                    <span className={styles.fieldValue}>
                      {formatNullableDate(
                        summaryCards.impactSummary.lastRunAt
                      )}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Run Status</span>
                    <span className={styles.fieldValue}>
                      {formatNullableString(
                        summaryCards.impactSummary.latestRunStatus,
                        getRunStatusLabel
                      )}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldName}>Exceptions</span>
                    <span className={styles.fieldValue}>
                      {formatExceptionsCount(
                        summaryCards.impactSummary.exceptionsCount
                      )}
                    </span>
                  </div>
                  {summaryCards.impactSummary.cta && (
                    <div className={styles.ctaRow}>
                      <Link
                        href={summaryCards.impactSummary.cta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        appearance="subtle"
                      >
                        {summaryCards.impactSummary.cta.label}
                        <ArrowRightRegular />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick message + action buttons */}
          <div className={styles.quickMessageRow}>
            <Textarea
              className={styles.quickMessageInput}
              placeholder="Type a message..."
              value={quickMessageText}
              onChange={(_e, data) => setQuickMessageText(data.value)}
              resize="vertical"
            />
            <div className={styles.quickMessageButtons}>
              <div className={styles.quickMessageButtonsTopRow}>
                <Button
                  className={styles.btnSend}
                  disabled={!quickMessageText.trim() || messagePosting}
                  onClick={handleQuickSend}
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
              <div className={styles.quickMessageButtonsBottomRow}>
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

          {eventPostError && (
            <div className={styles.errorBanner}>
              <Text className={fluentStyles.errorState} size={200}>
                {eventPostError}
              </Text>
            </div>
          )}
        </div>

        {/* Content sections — no more standalone SummaryCardsSection */}
        {directChanges && <DirectChangesSection data={directChanges} />}

        {impactData && <ImpactDataSection data={impactData} />}

        {reviewApproval && (
          <ReviewApprovalSection
            data={reviewApproval}
            scenarioId={selectedDetail.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.contentPadding}`}>
      <Text className={fluentStyles.emptyState} size={400} block>
        Select a scenario
      </Text>
    </div>
  );
};

export default ScenarioDetailPane;
