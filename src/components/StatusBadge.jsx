import { STATUS } from '../lib/constants';

const CLASS_BY_STATUS = {
  [STATUS.OVERDUE]: 'badge badge--overdue',
  [STATUS.DUE_SOON]: 'badge badge--due-soon',
  [STATUS.OK]: 'badge badge--ok',
  [STATUS.NEVER_CLEANED]: 'badge badge--never',
  [STATUS.NOT_TRACKED]: 'badge badge--not-tracked'
};

export default function StatusBadge({ status, title }) {
  return (
    <span className={CLASS_BY_STATUS[status] ?? 'badge'} title={title}>
      {status}
    </span>
  );
}
