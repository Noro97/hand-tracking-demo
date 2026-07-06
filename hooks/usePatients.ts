import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';

export interface Patient {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface PatientsState {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  addPatient: (displayName: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/** RLS scopes every query/insert to the signed-in clinician — no explicit clinician_id filter needed on reads. */
export function usePatients(): PatientsState {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('patients')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    setPatients((data ?? []).map((row) => ({ id: row.id, displayName: row.display_name, createdAt: row.created_at })));
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPatient = useCallback(
    async (displayName: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error: insertError } = await supabase
        .from('patients')
        .insert({ display_name: displayName, clinician_id: user.id });
      if (insertError) throw insertError;
      await refresh();
    },
    [refresh],
  );

  return { patients, loading, error, addPatient, refresh };
}

export interface PatientState {
  patient: Patient | null;
  loading: boolean;
  error: string | null;
}

/** Single-patient lookup for the patient detail screen. RLS means a not-found result and an unauthorized one look identical (both empty) — fine for this UI, which just shows "not found" either way. */
export function usePatient(id: string | undefined): PatientState {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('patients')
      .select('id, display_name, created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError) {
          setError(queryError.message);
        } else {
          setPatient(data ? { id: data.id, displayName: data.display_name, createdAt: data.created_at } : null);
          setError(null);
        }
        setLoading(false);
      });
  }, [id]);

  return { patient, loading, error };
}
