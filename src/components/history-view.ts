import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getDeviceHistory } from '../api';
import type { Reading } from '../model';

@customElement('history-view')
export class HistoryView extends LitElement {
  @property() deviceId = '';
  @property() unit = '°C';
  @property() label = 'Показник';
  @state() private fromDate = this.dateOffset(-1);
  @state() private toDate = this.dateOffset(0);
  @state() private readings: Reading[] = [];
  @state() private loading = false;
  @state() private errorMessage = '';
  @state() private loaded = false;

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private dateOffset(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private async load() {
    this.errorMessage = '';
    this.loaded = false;
    if (!this.fromDate || !this.toDate || this.fromDate > this.toDate) {
      this.errorMessage = 'Початкова дата має бути раніше або дорівнювати кінцевій.';
      return;
    }
    this.loading = true;
    try {
      const from = new Date(`${this.fromDate}T00:00:00.000Z`).toISOString();
      const to = new Date(`${this.toDate}T23:59:59.999Z`).toISOString();
      this.readings = await getDeviceHistory(this.deviceId, from, to);
      this.loaded = true;
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося завантажити історію.';
      console.error(`Не вдалося завантажити історію пристрою ${this.deviceId}`, error);
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <section class="history">
        <div class="head">
          <div>
            <h2>Історія показань</h2>
            <p>Історичні дані агреговано сервером раз на хвилину.</p>
          </div>
          <span class="count">${this.readings.length} / 1000 точок</span>
        </div>
        <form
          class="filters"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            void this.load();
          }}
        >
          <label
            >Від дати<input
              type="date"
              .value=${this.fromDate}
              max=${this.toDate}
              @change=${(event: Event) => (this.fromDate = (event.target as HTMLInputElement).value)}
          /></label>
          <label
            >До дати<input
              type="date"
              .value=${this.toDate}
              min=${this.fromDate}
              max=${this.dateOffset(0)}
              @change=${(event: Event) => (this.toDate = (event.target as HTMLInputElement).value)}
          /></label>
          <button type="submit" ?disabled=${this.loading}>
            ${this.loading ? 'Завантаження…' : 'Показати'}
          </button>
        </form>
        ${this.errorMessage ? html`<div class="error" role="alert">${this.errorMessage}</div>` : ''}
        ${
          this.loading
            ? html`<div class="empty">Завантаження показань…</div>`
            : this.loaded && this.readings.length === 0
              ? html`<div class="empty">За вибраний період показань немає.</div>`
              : this.readings.length
                ? html`<live-chart
                      .points=${this.readings}
                      .unit=${this.unit}
                      .label=${this.label}
                    ></live-chart>
                    <div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Час</th>
                            <th>Середнє</th>
                            <th>Мінімум</th>
                            <th>Максимум</th>
                            <th>Зразків</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this.readings
                            .slice()
                            .reverse()
                            .map(
                              (point) =>
                                html`<tr>
                                  <td>${new Date(point.ts).toLocaleString('uk-UA')}</td>
                                  <td>${point.value} ${this.unit}</td>
                                  <td>${point.min ?? '—'}</td>
                                  <td>${point.max ?? '—'}</td>
                                  <td>${point.count ?? '—'}</td>
                                </tr>`,
                            )}
                        </tbody>
                      </table>
                    </div>`
                : ''
        }
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .history {
      padding: 18px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: #fff;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .head h2 {
      margin: 0;
      color: #304337;
      font-size: 13px;
    }
    .head p {
      margin: 5px 0 0;
      color: #8a968e;
      font-size: 9px;
    }
    .count {
      color: #88958c;
      font-size: 8px;
    }
    .filters {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      margin: 15px 0;
      padding: 11px;
      border-radius: 6px;
      background: #f7f9f7;
    }
    .filters label {
      display: grid;
      gap: 5px;
      color: #78867e;
      font-size: 8px;
    }
    .filters input {
      height: 31px;
      padding: 0 8px;
      border: 1px solid #e1e8e3;
      border-radius: 5px;
      color: #415247;
      background: white;
      font: inherit;
      font-size: 9px;
    }
    .filters button {
      height: 31px;
      padding: 0 13px;
      border: 0;
      border-radius: 5px;
      color: white;
      background: #205c39;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .filters button:disabled {
      opacity: 0.6;
    }
    .error {
      margin: 12px 0;
      padding: 9px;
      border-radius: 5px;
      color: #a33;
      background: #fff0ef;
      font-size: 9px;
    }
    .empty {
      padding: 40px 10px;
      color: #859188;
      font-size: 10px;
      text-align: center;
    }
    .table-wrap {
      max-height: 300px;
      margin-top: 17px;
      overflow: auto;
      border: 1px solid #edf1ee;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th,
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #edf1ee;
      color: #758279;
      font-size: 8px;
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      color: #7d8b81;
      background: #f6f9f6;
      font-weight: 650;
    }
    td:nth-child(n + 2) {
      color: #415448;
    }
  `;
}
