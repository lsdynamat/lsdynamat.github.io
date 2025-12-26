/* ===== Keyword sample modal: solid (no transparency) ===== */

.modalOverlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.70);   /* overlay vẫn hơi tối để focus */
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.modalBox{
  width: min(980px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border-radius: 14px;

  /* SOLID background */
  background: #0b1020;
  border: 1px solid #1f2a44;
}

.modalBox .rowitem{
  background: #0f172a;          /* solid */
  border: 1px solid #24314f;
  border-radius: 12px;
}

.modalBox .preview{
  background: #0f172a;          /* solid */
  border: 1px solid #24314f;
  border-radius: 12px;

  overflow: auto;
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
  font-size: 13px;
  line-height: 1.45;
  padding: 12px;
}

/* if your global .card uses transparency, force solid inside modal */
.modalBox.card{
  background: #0b1020 !important;
}
