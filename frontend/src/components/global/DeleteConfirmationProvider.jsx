import { useEffect, useRef, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import {
  buildDeleteMessage,
  registerDeleteConfirm,
} from "./deleteConfirm";

export default function DeleteConfirmationProvider({ children }) {
  const resolverRef = useRef(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    registerDeleteConfirm((options = {}) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setConfig(options);
      });
    });

    return () => {
      registerDeleteConfirm(null);
    };
  }, []);

  const closeModal = (confirmed) => {
    if (resolverRef.current) {
      resolverRef.current(confirmed);
      resolverRef.current = null;
    }
    setConfig(null);
  };

  return (
    <>
      {children}
      <ConfirmationModal
        isOpen={Boolean(config)}
        onClose={() => closeModal(false)}
        onConfirm={() => closeModal(true)}
        title={config?.title || "Confirm Delete"}
        message={
          config?.message ||
          buildDeleteMessage({
            entityLabel: config?.entityLabel,
            entityLabelPlural: config?.entityLabelPlural,
            count: config?.count,
            itemName: config?.itemName,
          })
        }
        confirmButtonText={config?.confirmButtonText || "Delete"}
        cancelButtonText={config?.cancelButtonText || "Cancel"}
        details={config?.details || null}
      />
    </>
  );
}
