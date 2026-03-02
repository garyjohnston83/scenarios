import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Text, Link, makeStyles, tokens } from '@fluentui/react-components';

const useFluentStyles = makeStyles({
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },
});

interface ExternalRedirectViewProps {
  url: string | null | undefined;
  scenarioId: string;
}

export const ExternalRedirectView: React.FC<ExternalRedirectViewProps> = ({
  url,
  scenarioId,
}) => {
  const navigate = useNavigate();
  const fluentStyles = useFluentStyles();
  const [popupBlocked, setPopupBlocked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

      if (newWindow === null) {
        // Popup was blocked
        setPopupBlocked(true);
      } else {
        // Successfully opened, navigate back to governance
        navigate(`/scenarios/${scenarioId}`, { replace: true });
      }
    }, 500);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [url, scenarioId, navigate]);

  // No URL available
  if (!url) {
    return (
      <div className={fluentStyles.container}>
        <Text className={fluentStyles.errorText} size={400}>
          External URL is not available
        </Text>
        <Link
          inline
          onClick={(e) => {
            e.preventDefault();
            navigate(`/scenarios/${scenarioId}`);
          }}
        >
          Back to Governance
        </Link>
      </div>
    );
  }

  // Popup was blocked
  if (popupBlocked) {
    return (
      <div className={fluentStyles.container}>
        <Text size={400}>
          Your browser blocked the popup. Click below to open the external system:
        </Text>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          inline
        >
          Open External System
        </Link>
        <Link
          inline
          onClick={(e) => {
            e.preventDefault();
            navigate(`/scenarios/${scenarioId}`);
          }}
        >
          Back to Governance
        </Link>
      </div>
    );
  }

  // Default: redirecting state
  return (
    <div className={fluentStyles.container}>
      <Spinner size="medium" label="Redirecting to external system..." />
    </div>
  );
};

export default ExternalRedirectView;
