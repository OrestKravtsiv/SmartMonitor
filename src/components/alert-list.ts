import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { acknowledgeAlert, listAlerts } from '../api';
import { enablePushNotifications } from '../notifications';
import type { Alert } from '../model';
import { store } from '../store';

@customElement('alert-list')
export class AlertList extends LitElement {
  @state() private filter: 'all' | 'active' | 'acknowledged' = 'active';
  @state() private loading = true;
  @state() private errorMessage = '';
  @state() private actionMessage = '';
  @state() private busyId = '';
  @state() private pushBusy = false;
  @state() private revision = 0;
  @state() private deviceFilter =
    new URLSearchParams(window.location.search).get('deviceId') ?? '';
  private poller?: number;

  private readonly refresh = () => {
    this.revision += 1;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
    void this.load();
    this.poller = window.setInterval(() => void this.load(false), 10_000);
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    if (this.poller !== undefined) window.clearInterval(this.poller);
    super.disconnectedCallback();
  }

  private async load(showLoading = true) {
    if (showLoading) this.loading = true;
    try {
      await listAlerts();
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося завантажити сповіщення.';
      console.error('Не вдалося завантажити список сповіщень', error);
    } finally {
      this.loading = false;
    }
  }

  private get alerts(): Alert[] {
    void this.revision;
    return store.alerts.filter((alert) => {
      if (this.deviceFilter && alert.deviceId !== this.deviceFilter) return false;
      if (this.filter === 'active') return !alert.acknowledged;
      if (this.filter === 'acknowledged') return alert.acknowledged;
      return true;
    });
  }

  private async acknowledge(alert: Alert) {
    this.busyId = alert.id;
    this.actionMessage = '';
    try {
      await acknowledgeAlert(alert.id);
      this.actionMessage = 'Сповіщення позначено як опрацьоване.';
    } catch (error) {
      this.actionMessage =
        error instanceof Error ? error.message : 'Не вдалося підтвердити сповіщення.';
      console.error(`Не вдалося підтвердити сповіщення ${alert.id}`, error);
    } finally {
      this.busyId = '';
    }
  }

  private async enablePush() {
    this.pushBusy = true;
    this.actionMessage = '';
    try {
      await enablePushNotifications();
      this.actionMessage = 'Push-сповіщення успішно увімкнено.';
    } catch (error) {
      this.actionMessage =
        error instanceof Error ? error.message : 'Не вдалося увімкнути push-сповіщення.';
      console.error('Не вдалося увімкнути push-сповіщення', error);
    } finally {
      this.pushBusy = false;
    }
  }

  render() {
    const activeCount = store.alerts.filter((alert) => !alert.acknowledged).length;
    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">ЦЕНТР ПОДІЙ</div>
          <h1>Сповіщення</h1>
          <p>Переглядайте аномалії та підтверджуйте опрацьовані події.</p>
        </div>
        <button class="push-button" @click=${this.enablePush} ?disabled=${this.pushBusy}>
          ${this.pushBusy ? 'Увімкнення…' : '♧ Увімкнути push'}
        </button>
      </div>
      <section class="stats">
        <div><span>Активні</span><strong class="active">${activeCount}</strong></div>
        <div>
          <span>Опрацьовані</span><strong>${store.alerts.length - activeCount}</strong>
        </div>
        <div><span>Усього</span><strong>${store.alerts.length}</strong></div>
      </section>
      <section class="panel">
        <div class="toolbar" role="tablist" aria-label="Фільтр сповіщень">
          <button
            class=${this.filter === 'active' ? 'selected' : ''}
            @click=${() => (this.filter = 'active')}
          >
            Активні <span>${activeCount}</span>
          </button>
          <button
            class=${this.filter === 'acknowledged' ? 'selected' : ''}
            @click=${() => (this.filter = 'acknowledged')}
          >
            Опрацьовані
          </button>
          <button
            class=${this.filter === 'all' ? 'selected' : ''}
            @click=${() => (this.filter = 'all')}
          >
            Усі
          </button>
          <select
            aria-label="Фільтр за пристроєм"
            .value=${this.deviceFilter}
            @change=${(event: Event) => (this.deviceFilter = (event.target as HTMLSelectElement).value)}
          >
            <option value="">Усі пристрої</option>
            ${store.devices.map((device) => html`<option value=${device.id}>${device.name}</option>`)}
          </select>
          <span class="polling"><i></i> Оновлення кожні 10 с</span>
        </div>
        ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
        ${this.actionMessage ? html`<div class="notice" role="status">${this.actionMessage}</div>` : ''}
        ${
          this.loading
            ? html`<div class="empty">Завантаження сповіщень…</div>`
            : this.alerts.length === 0
              ? html`<div class="empty">
                  <span>✓</span><strong>Тут поки тихо</strong
                  ><small
                    >${this.filter === 'active' ? 'Активних сповіщень немає.' : 'Подій для цього фільтра немає.'}</small
                  >
                </div>`
              : html`<div class="list">
                  ${this.alerts.map(
                    (alert) => html`
                      <article class="alert ${alert.acknowledged ? 'done' : ''}">
                        <span class="icon">${alert.acknowledged ? '✓' : '!'}</span>
                        <div class="details">
                          <div class="title-row">
                            <strong>${alert.deviceName}</strong
                            ><span class="state"
                              >${alert.acknowledged ? 'Опрацьовано' : 'Потребує уваги'}</span
                            >
                          </div>
                          <p>${alert.message}</p>
                          <div class="meta">
                            <span>${alert.deviceId ?? 'Пристрій'}</span
                            ><span>${alert.time}</span
                            >${alert.actualValue !== undefined ? html`<span>Показник: ${alert.actualValue} · поріг: ${alert.thresholdValue ?? '—'}</span>` : ''}
                          </div>
                        </div>
                        ${
                          alert.acknowledged
                            ? html`<span class="acknowledged"
                                >Підтверджено${alert.acknowledgedBy ? html` · ${alert.acknowledgedBy}` : ''}</span
                              >`
                            : html`<button
                                class="ack"
                                ?disabled=${this.busyId === alert.id}
                                @click=${() => this.acknowledge(alert)}
                              >
                                ${this.busyId === alert.id ? 'Зачекайте…' : 'Підтвердити'}
                              </button>`
                        }
                      </article>
                    `,
                  )}
                </div>`
        }
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 22px;
    }
    .eyebrow {
      margin-bottom: 8px;
      color: #57916a;
      font-size: 9px;
      font-weight: 750;
      letter-spacing: 1.2px;
    }
    h1 {
      margin: 0;
      color: #1b2c22;
      font-size: 27px;
      letter-spacing: -0.8px;
    }
    .page-head p {
      margin: 7px 0 0;
      color: #829087;
      font-size: 11px;
    }
    .push-button,
    .ack {
      min-height: 35px;
      padding: 0 12px;
      border: 1px solid #dce8de;
      border-radius: 6px;
      color: #45875a;
      background: white;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .push-button:hover,
    .ack:hover {
      background: #f4faf5;
    }
    .push-button:disabled,
    .ack:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    .stats > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 15px;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: #fff;
    }
    .stats span {
      color: #7d8981;
      font-size: 9px;
    }
    .stats strong {
      color: #3a4e41;
      font-size: 17px;
    }
    .stats .active {
      color: #b77b38;
    }
    .panel {
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: #fff;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 14px;
      border-bottom: 1px solid #edf1ee;
    }
    .toolbar button {
      padding: 8px 10px;
      border: 0;
      border-radius: 5px;
      color: #7a887e;
      background: transparent;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .toolbar button.selected {
      color: #37774c;
      background: #edf7ef;
      font-weight: 650;
    }
    .toolbar button span {
      margin-left: 4px;
    }
    .polling {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      color: #8a968e;
      font-size: 8px;
    }
    .polling i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #60b979;
    }
    .notice {
      margin: 12px 14px 0;
      padding: 9px 11px;
      border-radius: 5px;
      color: #477b55;
      background: #f0f8f1;
      font-size: 9px;
    }
    .notice.error {
      color: #a23d3d;
      background: #fff0ef;
    }
    .list {
      padding: 0 16px;
    }
    .alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px 2px;
      border-bottom: 1px solid #edf1ee;
    }
    .alert:last-child {
      border-bottom: 0;
    }
    .icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      color: #b37b3f;
      background: #fff5e8;
      font-weight: 700;
      font-size: 12px;
    }
    .done .icon {
      color: #4e9661;
      background: #edf7ef;
    }
    .details {
      min-width: 0;
      flex: 1;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-row strong {
      color: #364a3c;
      font-size: 10px;
    }
    .state {
      padding: 4px 6px;
      border-radius: 4px;
      color: #ad773d;
      background: #fff6e8;
      font-size: 7px;
    }
    .done .state {
      color: #568360;
      background: #eef7ef;
    }
    .details p {
      margin: 7px 0;
      color: #718078;
      font-size: 9px;
    }
    .meta {
      display: flex;
      gap: 13px;
      color: #9aa49d;
      font-size: 8px;
    }
    .acknowledged {
      color: #86958a;
      font-size: 8px;
    }
    .ack {
      flex: none;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 7px;
      padding: 50px 15px;
      color: #88958c;
      font-size: 10px;
    }
    .empty > span {
      color: #5da270;
      font-size: 21px;
    }
    .empty strong {
      color: #53645a;
      font-size: 11px;
    }
    .empty small {
      font-size: 9px;
    }
  `;
}
