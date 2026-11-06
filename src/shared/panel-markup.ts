export const PANEL_LINK_ICON = html`<svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path
    d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
  />
</svg>`

function html(strings: TemplateStringsArray, ...values: string[]) {
  return strings.reduce(
    (markup, part, index) => markup + part + (values[index] || ""),
    "",
  )
}

export function createPanelMarkup(scriptVersion: string, siteLink: string) {
  return html` <button
      type="button"
      class="oc-closed"
      id="osm2cai-open"
      title="Apri OSM2CAI"
      aria-label="Apri barra OSM2CAI"
    >
      ▶
    </button>
    <div class="oc-card">
      <div class="oc-main">
        <div class="oc-metrics">
          <div class="oc-metric">
            <div>
              <div class="oc-label">OSM2CAI API</div>
              <div class="oc-value" id="osm2cai-status">⏳ Verifica</div>
            </div>
          </div>
          <div class="oc-metric">
            <div>
              <div class="oc-label">SDA</div>
              <div class="oc-value" id="osm2cai-sda">—</div>
            </div>
          </div>
          <div
            class="oc-metric oc-issues-trigger"
            id="osm2cai-issues-trigger"
            role="button"
            tabindex="0"
            aria-label="Dettagli stato di percorribilità"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="osm2cai-issues-popover"
          >
            <div>
              <div class="oc-label">Stato di percorribilità</div>
              <div class="oc-value" id="osm2cai-issues">—</div>
            </div>
          </div>
          <div class="oc-metric">
            <div>
              <div class="oc-label">Data validazione</div>
              <div class="oc-value" id="osm2cai-date">—</div>
            </div>
          </div>
          <div class="oc-metric">
            <div>
              <div class="oc-label">Allineamento</div>
              <div class="oc-value" id="osm2cai-sync">—</div>
            </div>
          </div>
        </div>
      </div>
      <div class="oc-member-row">
        <button
          type="button"
          class="oc-member-button"
          id="osm2cai-order-button"
          aria-label="Analisi relazione"
          aria-controls="osm2cai-order-popover"
          aria-expanded="false"
        >
          <span
            class="oc-member-dot"
            id="osm2cai-order-dot"
            aria-hidden="true"
          ></span>
          <span>Analisi relazione</span>
        </button>
        <div class="oc-actions">
          <a
            class="oc-action"
            id="osm2cai-target"
            aria-disabled="true"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apri su OSM2CAI"
            title="Apri su OSM2CAI"
            ><span class="oc-action-icon">${PANEL_LINK_ICON}</span
            ><span>OSM2CAI</span></a
          >
          ${siteLink}
          <div class="oc-help-wrap">
            <button
              type="button"
              class="oc-info-button"
              id="osm2cai-info-button"
              aria-label="Info OSM2CAI Tools"
              aria-controls="osm2cai-popover"
              aria-expanded="false"
            >
              ?
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="oc-close-rail">
      <button
        type="button"
        class="oc-close-button"
        id="osm2cai-close"
        title="Compatta OSM2CAI"
        aria-label="Compatta barra OSM2CAI"
      >
        ◀
      </button>
    </div>
    <div
      class="oc-popover"
      id="osm2cai-popover"
      role="dialog"
      aria-label="Info OSM2CAI Tools"
      hidden
    >
      <div
        class="oc-popup-content"
        style="padding:14px 18px 16px;font:13px/1.4 system-ui,-apple-system,sans-serif;"
      >
        <div class="oc-popup-heading">
          <div class="oc-popup-brand">
            <div class="oc-popup-title">OSM2CAI Tools</div>
            <div class="oc-popup-version">
              Versione ${scriptVersion} · Strumenti per OpenStreetMap e OSM2CAI
            </div>
          </div>
          <button
            type="button"
            class="oc-popup-close"
            id="osm2cai-popup-close"
            aria-label="Chiudi informazioni"
            title="Chiudi"
          >
            ×
          </button>
        </div>
        <div class="oc-popup-documentation">
          <div class="oc-popup-doc-section">
            <div class="oc-popup-doc-label">Progetto e documentazione</div>
            <nav class="oc-popup-links" aria-label="Progetto e documentazione">
              <a
                href="https://github.com/andrea-del-sarto/OSM2CAI_Tools"
                target="_blank"
                rel="noopener noreferrer"
                title="Apri il progetto su GitHub"
                >GitHub <span aria-hidden="true">↗</span></a
              >
              <a
                href="https://github.com/andrea-del-sarto/OSM2CAI_Tools/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                title="Presentazione e installazione"
                >README.md <span aria-hidden="true">↗</span></a
              >
              <a
                href="https://github.com/andrea-del-sarto/OSM2CAI_Tools/blob/main/FUNZIONALIT%C3%80.md"
                target="_blank"
                rel="noopener noreferrer"
                title="Guida alle funzionalità"
                >Funzionalità <span aria-hidden="true">↗</span></a
              >
            </nav>
          </div>
          <div class="oc-popup-doc-section">
            <div class="oc-popup-doc-label">Risorse CAI / OSM</div>
            <nav
              class="oc-popup-links"
              aria-label="Risorse CAI e OpenStreetMap"
            >
              <a
                href="https://catastorei.gitbook.io/documentazione-osm2cai"
                target="_blank"
                rel="noopener noreferrer"
                >Documentazione OSM2CAI <span aria-hidden="true">↗</span></a
              >
              <a
                href="https://wiki.openstreetmap.org/wiki/IT:CAI"
                target="_blank"
                rel="noopener noreferrer"
                >Linee guida OSM/CAI <span aria-hidden="true">↗</span></a
              >
            </nav>
          </div>
        </div>
        <div
          class="oc-help-legend-heading"
          style="font-size:13px;font-weight:700;margin:0 0 6px;"
        >
          Legenda
        </div>
        <div
          class="oc-help-legend"
          style="display:flex;flex-wrap:wrap;align-items:center;gap:7px 14px;font-size:12px;margin-bottom:12px;"
        >
          <span
            ><span
              style="display:inline-block;width:12px;height:12px;background:#22bd3c;border-radius:50%;margin-right:6px;"
            ></span
            >Positivo</span
          >
          <span
            ><span
              style="display:inline-block;width:12px;height:12px;background:#ed3043;border-radius:50%;margin-right:6px;"
            ></span
            >Problema</span
          >
          <span
            ><span
              style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:50%;margin-right:6px;"
            ></span
            >Stato intermedio</span
          >
          <span
            ><span
              style="display:inline-block;width:12px;height:12px;background:#9ca3af;border-radius:50%;margin-right:6px;"
            ></span
            >Sconosciuto</span
          >
        </div>
        <div
          class="oc-help-table-heading"
          style="font-size:14px;font-weight:700;margin:14px 0 8px;"
        >
          Informazioni della barra
        </div>
        <table
          class="oc-help-table"
          style="width:100%;border-collapse:collapse;table-layout:fixed;text-align:left;font-size:13px;line-height:1.4;"
        >
          <tbody>
            <tr>
              <td>OSM2CAI API</td>
              <td>Disponibilità del servizio OSM2CAI.</td>
            </tr>
            <tr>
              <td>SDA</td>
              <td>Stato di accatastamento CAI.</td>
            </tr>
            <tr>
              <td>Percorribilità</td>
              <td>Stato del percorso e dettagli disponibili.</td>
            </tr>
            <tr>
              <td>Data validazione</td>
              <td>Età dell'ultima validazione OSM2CAI.</td>
            </tr>
            <tr>
              <td>Allineamento</td>
              <td>Confronto tra le date OSM e OSM2CAI.</td>
            </tr>
            <tr>
              <td>Analisi relazione</td>
              <td>Controllo della continuità e possibili problemi.</td>
            </tr>
          </tbody>
        </table>
        <div class="oc-help-more" style="font-size:12px;margin-top:10px;">
          Per la spiegazione dettagliata dei controlli consulta
          <a
            href="https://github.com/andrea-del-sarto/OSM2CAI_Tools/blob/main/FUNZIONALIT%C3%80.md"
            target="_blank"
            rel="noopener noreferrer"
            >Funzionalità ↗</a
          >.
        </div>
      </div>
    </div>
    <div
      class="oc-order-popover"
      id="osm2cai-order-popover"
      role="dialog"
      aria-label="Analisi relazione"
      hidden
    >
      <div class="oc-order-popover-content">
        <div class="oc-order-header">
          <div class="oc-order-title">Analisi relazione</div>
          <button
            type="button"
            class="oc-order-close"
            id="osm2cai-order-close"
            aria-label="Chiudi verifica membri"
          >
            ×
          </button>
        </div>
        <div
          id="osm2cai-order-results"
          aria-live="polite"
          style="margin:0;"
        ></div>
      </div>
    </div>
    <div
      id="osm2cai-issues-popover"
      class="oc-issues-popover"
      role="dialog"
      aria-label="Dettagli stato di percorribilità"
      hidden
    >
      <div
        class="oc-issues-heading"
        style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;"
      >
        <strong class="oc-issues-heading-title" style="font-size:15px;"
          >Stato di percorribilità</strong
        >
        <button
          type="button"
          id="osm2cai-issues-close"
          aria-label="Chiudi dettagli percorribilità"
          style="cursor:pointer;border:1px solid #8797ac;border-radius:50%;width:26px;height:26px;background:white;color:#356293;"
        >
          ×
        </button>
      </div>
      <table class="oc-issues-table">
        <tbody>
          <tr>
            <th scope="row">Descrizione</th>
            <td class="oc-issues-description" id="osm2cai-issues-description">
              —
            </td>
          </tr>
          <tr>
            <th scope="row">Data aggiornamento</th>
            <td id="osm2cai-issues-updated">—</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="osm2cai-modified-popup" role="tooltip" hidden></div>`
}
