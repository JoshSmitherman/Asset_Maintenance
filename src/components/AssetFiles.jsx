import AttachmentList from './AttachmentList';
import { formatDate } from '../lib/dates';

/**
 * The asset's Files tab: its own files (the purchase invoice, photos) and,
 * below, the ones attached to its repairs, each saying which repair.
 */
export default function AssetFiles({ files, repairs, isAdmin, readOnly }) {
  if (files.error) {
    return <div className="alert alert--error" role="alert"><span>{files.error}</span></div>;
  }

  const own = files.attachments.filter((file) => !file.repair_id);
  const fromRepairs = files.attachments.filter((file) => file.repair_id);
  const repairById = new Map(repairs.map((repair) => [repair.id, repair]));

  return (
    <div className="asset-files">
      <h3 className="asset-files__title">This asset</h3>
      <p className="field__hint">The purchase invoice, warranty documents, photos.</p>
      <AttachmentList
        attachments={own}
        onUpload={(file) => files.upload(file)}
        onRemove={files.remove}
        onOpen={files.linkFor}
        isAdmin={isAdmin}
        readOnly={readOnly}
        emptyMessage={files.loading && own.length === 0 ? 'Loading files…' : 'No files attached yet.'}
      />

      {fromRepairs.length > 0 ? (
        <>
          <h3 className="asset-files__title">From repairs</h3>
          <AttachmentList
            attachments={fromRepairs}
            onRemove={files.remove}
            onOpen={files.linkFor}
            isAdmin={isAdmin}
            // Added from the repair itself, so it says which one it was.
            readOnly
            describe={(file) => {
              const repair = repairById.get(file.repair_id);
              return repair ? `repair ${formatDate(repair.repaired_on)}` : 'a repair';
            }}
          />
        </>
      ) : null}
    </div>
  );
}
