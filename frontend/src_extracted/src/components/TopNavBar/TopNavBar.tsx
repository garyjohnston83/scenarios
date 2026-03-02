import {
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import styles from './TopNavBar.module.scss';

const useFluentStyles = makeStyles({
  navBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
  },
  logoPlaceholder: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    color: tokens.colorNeutralForeground1,
  },
});

export const TopNavBar: React.FC = () => {
  const fluentStyles = useFluentStyles();

  return (
    <header
      className={`${styles.navBar} ${fluentStyles.navBar}`}
      role="banner"
    >
      <div
        className={`${styles.logoPlaceholder} ${fluentStyles.logoPlaceholder}`}
        data-testid="logo-placeholder"
        aria-label="Logo placeholder"
      >
        <Text size={200} weight="bold">S</Text>
      </div>
      <Text
        className={`${styles.title} ${fluentStyles.title}`}
        size={500}
        weight="semibold"
      >
        Scenarios
      </Text>
    </header>
  );
};

export default TopNavBar;
