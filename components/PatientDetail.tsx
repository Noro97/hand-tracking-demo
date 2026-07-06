import type { FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';

import { usePatient } from '../hooks/usePatients';

const PatientDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { patient, loading, error } = usePatient(id);

  return (
    <div className="min-h-screen bg-page text-text-primary font-roboto p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-text-muted w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to patients
        </Link>

        {loading && <p className="text-text-muted text-sm">Loading…</p>}
        {error && <p className="text-sm text-accent-red">{error}</p>}
        {!loading && !error && !patient && <p className="text-text-dim text-sm">Patient not found.</p>}

        {patient && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{patient.displayName}</h1>
              <Link
                to="/session"
                className="flex items-center gap-2 bg-accent-green/20 border border-accent-green text-accent-green rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Play className="w-4 h-4" /> Start BBT session
              </Link>
            </div>

            <div className="bg-surface p-4 rounded-[24px] border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">Session history</p>
              <p className="text-text-dim text-sm">
                No sessions recorded here yet — BBT sessions aren't wired to save against a patient record yet
                (next up). For now, export a session as JSON from the BBT screen.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientDetail;
