import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Reading } from '../model';
import { store } from '../store';

@customElement('live-chart')
export class LiveChart extends LitElement {
  @property() deviceId = '';
  @property() unit = '°C';
  @property() label = 'Показник';
  @property({ attribute: false }) points?: Reading[];
  @state() private revision = 0;

  private readonly refresh = () => {
    this.revision += 1;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    super.disconnectedCallback();
  }

  private get data() {
    void this.revision;
    return (
      this.points ??
      (this.deviceId ? (store.readings[this.deviceId] ?? []).slice(-120) : [])
    );
  }

  private get coordinates() {
    const data = this.data;
    if (data.length < 2) return '';
    const values = data.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 800;
        const y = 180 - ((value - min) / span) * 150 - 15;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  render() {
    const data = this.data;
    const last = data.at(-1);
    const first = data[0];
    const change = last && first ? last.value - first.value : 0;
    return html`
      <div class="summary">
        <span>${this.label}</span>
        <strong>${last ? last.value.toFixed(1) : '—'}<small> ${this.unit}</small></strong>
        ${
          data.length > 1
            ? html`<span class="change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}">
                ${change > 0 ? '↗' : change < 0 ? '↘' : '→'}
                ${Math.abs(change).toFixed(1)} ${this.unit}
              </span>`
            : ''
        }
      </div>
      ${
        data.length < 2
          ? html`<div class="empty">
              Очікуємо показання пристрою для побудови графіка.
            </div>`
          : html`
              <div class="chart">
                <div class="grid"><i></i><i></i><i></i><i></i></div>
                <svg
                  viewBox="0 0 800 200"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="${this.label}: графік зміни показника"
                >
                  <defs>
                    <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="#62bd7c" stop-opacity=".2" />
                      <stop offset="100%" stop-color="#62bd7c" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="${this.coordinates} L 800 200 L 0 200 Z"
                    fill="url(#chart-fill)"
                  />
                  <path
                    d="${this.coordinates}"
                    fill="none"
                    stroke="#4cab68"
                    stroke-width="3"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div class="chart-foot">
                <span>${first ? new Date(first.ts).toLocaleTimeString('uk-UA') : ''}</span
                ><span>${data.length} точок</span
                ><span>${last ? new Date(last.ts).toLocaleTimeString('uk-UA') : ''}</span>
              </div>
            `
      }
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .summary {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .summary > span:first-child {
      margin-right: auto;
      color: #75837a;
      font-size: 10px;
    }
    .summary strong {
      color: #274633;
      font-size: 23px;
    }
    .summary small {
      color: #829087;
      font-size: 10px;
      font-weight: 450;
    }
    .change {
      color: #86938a;
      font-size: 9px;
    }
    .change.up {
      color: #bc7e3b;
    }
    .change.down {
      color: #4b9a62;
    }
    .chart {
      position: relative;
      height: 190px;
      margin-top: 14px;
    }
    .chart svg {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .grid {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .grid i {
      border-top: 1px solid #edf1ee;
    }
    .chart-foot {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      color: #98a39b;
      font-size: 8px;
    }
    .empty {
      display: grid;
      place-items: center;
      min-height: 130px;
      margin-top: 12px;
      border: 1px dashed #e0e8e2;
      border-radius: 7px;
      color: #88958c;
      font-size: 10px;
      text-align: center;
    }
  `;
}
