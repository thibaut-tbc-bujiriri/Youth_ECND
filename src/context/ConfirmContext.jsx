import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirmer",
    cancelText: "Annuler",
    tone: "danger",
  });
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setResolver(() => resolve);
      setDialog({
        open: true,
        title: options.title || "Confirmation",
        message: options.message || "Voulez-vous continuer ?",
        confirmText: options.confirmText || "Confirmer",
        cancelText: options.cancelText || "Annuler",
        tone: options.tone || "danger",
      });
    });
  }, []);

  const closeDialog = useCallback(
    (result) => {
      if (resolver) resolver(result);
      setResolver(null);
      setDialog((current) => ({ ...current, open: false }));
    },
    [resolver],
  );

  const confirmBtnClass =
    dialog.tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : dialog.tone === "warning"
        ? "bg-amber-600 hover:bg-amber-700"
        : "bg-emerald-600 hover:bg-emerald-700";

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{dialog.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{dialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeDialog(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${confirmBtnClass}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm doit etre utilise dans ConfirmProvider");
  return context;
}

