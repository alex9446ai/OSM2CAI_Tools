export const CSS = `#osm2cai-bar,
#osm2cai-bar * {
  box-sizing: border-box !important;
}
#osm2cai-bar {
  position: fixed !important;
  top: 60px !important;
  left: 355px !important;
  width: 934px !important;
  max-width: calc(100vw - 365px) !important;
  z-index: 2147483000 !important;
  font:
    13px/1.35 system-ui,
    sans-serif !important;
  color: #233344 !important;
  pointer-events: none !important;
}
#osm2cai-bar .oc-card {
  margin-left: 34px;
  width: calc(100% - 34px);
  height: 98px;
  pointer-events: auto;
  background: #fff;
  border: 1px solid #d8dfe7;
  border-radius: 0 7px 7px 0;
  box-shadow: 0 2px 9px #0002;
  overflow: hidden;
}
#osm2cai-bar .oc-main {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 6px 12px;
  gap: 10px;
  border-bottom: 1px solid #d8dfe7;
}
#osm2cai-bar .oc-metrics {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}
#osm2cai-bar .oc-metric {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}
#osm2cai-bar .oc-metric:nth-child(1) {
  flex: 0 0 90px;
  width: 90px;
}
#osm2cai-bar .oc-metric:nth-child(2) {
  flex: 0 0 55px;
  width: 55px;
}
#osm2cai-bar .oc-metric:nth-child(3) {
  flex: 0 0 220px;
  width: 220px;
}
#osm2cai-bar .oc-metric:nth-child(4) {
  flex: 0 0 135px;
  width: 135px;
}
#osm2cai-bar .oc-metric:nth-child(5) {
  flex: 0 0 145px;
  width: 145px;
}
#osm2cai-bar .oc-label {
  font-size: 12px;
  color: #5a6574;
  white-space: nowrap;
}
#osm2cai-bar .oc-value {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#osm2cai-bar .oc-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e7b743;
  vertical-align: -1px;
  margin-right: 5px;
}
#osm2cai-bar .oc-dot.ok {
  background: #22bd3c;
}
#osm2cai-bar .oc-dot.error {
  background: #ed3043;
}
#osm2cai-bar .oc-dot.warning {
  background: #e7b743;
}
#osm2cai-bar .oc-dot.gray {
  background: #9ca3af;
}
#osm2cai-bar .oc-dot.orange {
  background: #f59e0b;
}
#osm2cai-bar .oc-dot.validation-orange {
  background: #f97316;
}
#osm2cai-bar .oc-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 8px;
  flex: 0 0 auto;
  margin-left: auto;
}
#osm2cai-bar .oc-action {
  display: inline-flex;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 29px;
  padding: 0 10px;
  flex: 0 0 auto;
  min-width: 0;
  border: 1px solid #6682aa;
  border-radius: 6px;
  background: #fff;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  color: #356293;
  white-space: nowrap;
}
#osm2cai-bar a.oc-action:not([aria-disabled="true"]) {
  pointer-events: auto !important;
  cursor: pointer !important;
}
#osm2cai-bar .oc-action > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
#osm2cai-bar .oc-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  background: transparent;
  color: #356293;
  border-radius: 0;
  box-shadow: none;
}
#osm2cai-bar .oc-action-icon svg {
  width: 15px;
  height: 15px;
}
#osm2cai-bar a[aria-disabled="true"] {
  pointer-events: none;
  opacity: 0.5;
}
#osm2cai-bar .oc-info-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  flex: 0 0 26px;
  border: 1px solid #6682aa;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  background: white;
  color: #356293;
  font-weight: 700;
  cursor: pointer;
  margin-left: 4px;
}
#osm2cai-bar .oc-right-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 28px;
  flex: 0 0 28px;
  margin-left: 3px;
}
#osm2cai-bar .oc-close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}
#osm2cai-bar .oc-close-button,
#osm2cai-bar .oc-open-button {
  cursor: pointer;
  border: 1px solid #6682aa;
  color: #356293;
  background: white;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  font-weight: 700;
}
#osm2cai-bar .oc-closed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 98px;
  border-radius: 7px 0 0 7px;
  border: 1px solid #d8dee6;
  background: white;
  box-shadow: 0 2px 9px #0002;
  pointer-events: auto;
  cursor: pointer;
  font-size: 21px;
  color: #356293;
}
#osm2cai-bar .oc-close-rail {
  position: absolute;
  top: 0;
  left: 0;
  width: 34px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #d8dee6;
  border-right: 0;
  border-radius: 7px 0 0 7px;
  pointer-events: auto;
}
#osm2cai-bar .oc-help-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  flex: 0 0 32px;
}
#osm2cai-bar .oc-member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 12px;
  gap: 10px;
  background: rgba(52, 120, 237, 0.04);
}
#osm2cai-bar .oc-member-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 30px;
  padding: 0 16px;
  border: 1px solid #1650b0;
  border-radius: 6px;
  background: linear-gradient(#3478ed, #1451aa);
  color: #fff;
  box-shadow: 0 1px 3px #0002;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
#osm2cai-bar .oc-member-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #356293;
}
#osm2cai-bar .oc-member-icon svg {
  width: 18px;
  height: 18px;
}
#osm2cai-bar .oc-member-dot {
  display: inline-block;
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9ca3af;
}
#osm2cai-bar .oc-popover {
  position: absolute;
  left: 34px;
  top: 100%;
  margin-top: 5px;
  width: calc(100% - 34px);
  max-width: calc(100vw - 24px);
  max-height: 70vh;
  overflow: auto;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 3px 12px #0003;
  pointer-events: auto;
}
#osm2cai-bar .oc-order-popover {
  position: absolute;
  left: 34px;
  top: 100%;
  margin-top: 5px;
  width: 450px;
  max-width: calc(100vw - 24px);
  max-height: 70vh;
  overflow: auto;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 3px 12px #0003;
  pointer-events: auto;
}
#osm2cai-bar .oc-order-popover-content {
  padding: 14px 16px;
}
#osm2cai-bar .oc-order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
#osm2cai-bar .oc-order-title {
  font-size: 15px;
  font-weight: 700;
}
#osm2cai-bar .oc-order-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #6682aa;
  border-radius: 999px;
  background: white;
  color: #356293;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}
#osm2cai-bar .oc-issues-trigger {
  cursor: pointer;
  border-radius: 4px;
  outline-offset: 3px;
}
#osm2cai-bar .oc-issues-trigger:focus-visible {
  outline: 2px solid #3478ed;
}
#osm2cai-bar .oc-issues-popover {
  position: absolute;
  top: 100%;
  left: 34px;
  margin-top: 5px;
  width: 500px;
  max-width: calc(100vw - 24px);
  max-height: 65vh;
  overflow: auto;
  background: #fff;
  color: #233344;
  border: 1px solid #9ca9bb;
  border-radius: 8px;
  box-shadow: 0 7px 22px #0003;
  padding: 12px 14px;
  pointer-events: auto;
  font:
    13px/1.45 system-ui,
    sans-serif;
}
#osm2cai-bar .oc-issues-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
#osm2cai-bar .oc-issues-table th,
#osm2cai-bar .oc-issues-table td {
  text-align: left;
  vertical-align: top;
  padding: 10px 7px;
  border-bottom: 1px solid #d8dfe7;
  overflow-wrap: anywhere;
}
#osm2cai-bar .oc-issues-table th {
  width: 33%;
  font-weight: 650;
}
#osm2cai-bar .oc-issues-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
#osm2cai-bar .oc-issues-popover[hidden],
#osm2cai-bar .oc-popover[hidden],
#osm2cai-bar .oc-order-popover[hidden] {
  display: none !important;
}
`
