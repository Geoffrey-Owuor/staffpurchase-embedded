"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmationDialog from "../../Reusables/ConfirmationDialog";
import { saveAdminPromo } from "@/utils/FetchAdmin/fetchAdmin";
import { invalidatePromoQueries, overlapMessage } from "./staffOfferUi";

// Runs one Staff Offers write (saveAdminPromo) and owns the shared bits:
// busy key, error text, refreshing every promo query, and the 409 `overlap`
// refusal - shown as a confirmation (`overlapDialog`, render it once) that
// resends the same request with confirmOverlap: true.
export function usePromoSave() {
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState("");
  const [overlap, setOverlap] = useState(null);

  const save = async (key, method, path, body, onSuccess) => {
    setBusyKey(key);
    setError("");
    try {
      const result = await saveAdminPromo(method, path, body);
      setOverlap(null);
      await onSuccess?.(result);
    } catch (err) {
      if (err.data?.code === "overlap" && !body.confirmOverlap) {
        setOverlap({
          text: overlapMessage(err.data),
          retry: () =>
            save(key, method, path, { ...body, confirmOverlap: true }, onSuccess),
        });
      } else {
        setOverlap(null);
        setError(err.message);
      }
    } finally {
      setBusyKey(null);
      invalidatePromoQueries(queryClient);
    }
  };

  const overlapDialog = (
    <ConfirmationDialog
      showDialog={overlap !== null}
      title="Overlapping offers"
      message={overlap?.text}
      onConfirm={() => overlap?.retry()}
      onCancel={() => setOverlap(null)}
      busy={busyKey !== null}
      busyLabel="Saving..."
    />
  );

  return { save, busyKey, busy: busyKey !== null, error, setError, overlapDialog };
}
