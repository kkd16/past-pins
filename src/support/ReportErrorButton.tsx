import { Button } from '../components/Button';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { composeSupportEmail } from './compose-email';

export function ReportErrorButton({ disabled }: { disabled?: boolean }) {
  const guard = useActionGuard();
  return <Button label={t('support.error.label')} variant="quiet" disabled={disabled} onPress={() => void composeSupportEmail('error', guard())} />;
}
