import { useEffect, useRef } from "react";

export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="dialog-actions">
        <button className="btn" autoFocus onClick={onCancel}>Cancel</button>
        <button className="btn danger-solid" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
