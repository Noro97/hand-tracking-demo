import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Plus, User } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { usePatients } from '../hooks/usePatients';
import { supabase } from '../lib/supabaseClient';

const Dashboard: FC = () => {
  const { session } = useAuth();
  const { patients, loading, error, addPatient } = usePatients();
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await addPatient(newName.trim());
      setNewName('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-text-primary font-roboto p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Patients</h1>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{session?.user.email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 bg-border/20 border border-border rounded-lg px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-surface p-4 rounded-[24px] border border-border flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New patient name"
            className="flex-1 bg-border/20 border border-border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="flex items-center gap-2 bg-accent-green/20 border border-accent-green text-accent-green rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add patient
          </button>
        </form>
        {formError && <p className="text-sm text-accent-red">{formError}</p>}

        {loading && <p className="text-text-muted text-sm">Loading patients…</p>}
        {error && <p className="text-sm text-accent-red">{error}</p>}
        {!loading && !error && patients.length === 0 && (
          <p className="text-text-dim text-sm">No patients yet — add one above to get started.</p>
        )}

        <div className="flex flex-col gap-2">
          {patients.map((patient) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="flex items-center gap-3 bg-surface p-4 rounded-[16px] border border-border hover:border-accent-blue transition-colors"
            >
              <div className="p-2 rounded-full bg-border/40">
                <User className="w-4 h-4 text-accent-blue" />
              </div>
              <span className="font-medium">{patient.displayName}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
