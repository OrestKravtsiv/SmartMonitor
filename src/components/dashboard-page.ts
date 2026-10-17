import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import { acknowledgeAlert, listAlerts, listDevices, listZones } from '../api';
import type { Alert } from '../model';
import { store } from '../store';

@customElement('dashboard-page')
export class DashboardPage extends LitElement {
  @state() private revision = 0;
  @state() private selectedDeviceId = store.devices[0]?.id ?? '';
  @state() private errorMessage = '';
  @state() private actionMessage = '';

  private readonly refresh = () => {
    this.revision += 1;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
    void this.loadDashboard();
  }

  private async loadDashboard() {
    try {
      await Promise.all([listDevices(), listZones(), listAlerts()]);
      if (!this.selectedDeviceId) this.selectedDeviceId = store.devices[0]?.id ?? '';
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося оновити дані дашборду.';
      console.error('Не вдалося завантажити дані дашборду', error);
    }
  }

  private async acknowledge(alert: Alert) {
    this.actionMessage = '';
    try {
      await acknowledgeAlert(alert.id);
      this.actionMessage = 'Сповіщення позначено як опрацьоване.';
    } catch (error) {
      this.actionMessage =
        error instanceof Error ? error.message : 'Не вдалося підтвердити сповіщення.';
      console.error(`Не вдалося підтвердити сповіщення ${alert.id}`, error);
    }
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    super.disconnectedCallback();
  }

  render() {
    void this.revision;
    const online = store.devices.filter((device) => device.status === 'online').length;
    const needsAttention = store.devices.filter(
      (device) => device.status !== 'online',
    ).length;
    const activeAlerts = store.alerts.filter((alert) => !alert.acknowledged);

    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">ОГЛЯД СИСТЕМИ</div>
          <h1>Доброго дня!</h1>
          <p>Ось що відбувається з вашими пристроями просто зараз.</p>
        </div>
        <div class="live-badge">
          <span class=${store.mqttConnected ? 'connected' : ''}></span
          >${store.mqttConnected ? 'Дані надходять наживо' : 'Очікування live-з’єднання'}
        </div>
      </div>
      ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
      ${this.actionMessage ? html`<div class="notice" role="status">${this.actionMessage}</div>` : ''}

      <section class="metrics" aria-label="Показники системи">
        <article class="metric">
          <div class="metric-top">
            <span>Усього пристроїв</span><span class="metric-icon devices">▦</span>
          </div>
          <div class="metric-number">
            ${store.devices.length}<span class="metric-total"> пристроїв</span>
          </div>
          <div class="metric-foot">
            <span class="tiny-dot green"></span>${store.zones.length} активні зони
          </div>
        </article>
        <article class="metric">
          <div class="metric-top">
            <span>На зв’язку</span><span class="metric-icon online">⌁</span>
          </div>
          <div class="metric-number">
            ${online}<span class="metric-total"> пристрої</span>
          </div>
          <div class="metric-foot">
            <span class="tiny-dot green"></span
            >${store.devices.length ? Math.round((online / store.devices.length) * 100) : 0}%
            доступності
          </div>
        </article>
        <article class="metric">
          <div class="metric-top">
            <span>Потребують уваги</span><span class="metric-icon warning">!</span>
          </div>
          <div class="metric-number">
            ${needsAttention}<span class="metric-total"> пристрої</span>
          </div>
          <div class="metric-foot">
            <span class="tiny-dot ${needsAttention ? 'orange' : 'green'}"></span
            >${needsAttention ? 'Перевірте стан пристроїв' : 'Усе працює належно'}
          </div>
        </article>
        <article class="metric">
          <div class="metric-top">
            <span>Активні сповіщення</span><span class="metric-icon alerts">◇</span>
          </div>
          <div class="metric-number">
            ${activeAlerts.length}<span class="metric-total"> сповіщень</span>
          </div>
          <div class="metric-foot">
            <span class="tiny-dot ${activeAlerts.length ? 'orange' : 'green'}"></span
            >${activeAlerts.length ? 'Необхідна перевірка' : 'Немає нових сповіщень'}
          </div>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel telemetry">
          <div class="panel-heading">
            <div>
              <h2>Телеметрія</h2>
              <p>Середня температура пристроїв</p>
            </div>
            <select
              class="period"
              aria-label="Пристрій для графіка"
              .value=${this.selectedDeviceId}
              @change=${(event: Event) => (this.selectedDeviceId = (event.target as HTMLSelectElement).value)}
            >
              ${store.devices.map((device) => html`<option value=${device.id}>${device.name}</option>`)}
            </select>
          </div>
          ${(() => {
            const selected = store.devices.find(
              (device) => device.id === this.selectedDeviceId,
            );
            return selected
              ? html`<live-chart
                  .deviceId=${selected.id}
                  .unit=${selected.unit ?? '°C'}
                  .label=${selected.name}
                ></live-chart>`
              : html`<div class="chart-empty">
                  Додайте пристрій, щоб відображати телеметрію.
                </div>`;
          })()}
        </article>

        <article class="panel alerts-panel">
          <div class="panel-heading">
            <div>
              <h2>Останні сповіщення</h2>
              <p>Події, що потребують уваги</p>
            </div>
            <span class="alert-count">${activeAlerts.length} нових</span>
          </div>
          <div class="alert-list">
            ${store.alerts.map(
              (alert) => html`
                <div class="alert-row ${alert.acknowledged ? 'acknowledged' : ''}">
                  <div class="alert-icon">${alert.acknowledged ? '✓' : '!'}</div>
                  <div class="alert-copy">
                    <strong>${alert.deviceName}</strong>
                    <span>${alert.message}</span>
                    <small>${alert.time}</small>
                  </div>
                  ${
                    alert.acknowledged
                      ? html`<span class="done-label">Опрацьовано</span>`
                      : html`<button
                          class="ack-button"
                          @click=${() => void this.acknowledge(alert)}
                          aria-label="Підтвердити сповіщення"
                        >
                          ✓
                        </button>`
                  }
                </div>
              `,
            )}
            ${store.alerts.length === 0 ? html`<div class="empty">Нових сповіщень немає</div>` : ''}
          </div>
          <button class="all-alerts" @click=${() => Router.go('/alerts')}>
            Усі сповіщення <span>→</span>
          </button>
        </article>
      </section>

      <section class="panel devices-panel">
        <div class="panel-heading">
          <div>
            <h2>Стан пристроїв</h2>
            <p>Останній статус підключення</p>
          </div>
          ${store.user?.role === 'admin' ? html`<button class="view-all" @click=${() => Router.go('/devices')}>Усі пристрої <span>→</span></button>` : ''}
        </div>
        <div class="device-table">
          <div class="table-head">
            <span>ПРИСТРІЙ</span><span>ЗОНА</span><span>ТЕМПЕРАТУРА</span
            ><span>ВОЛОГІСТЬ</span><span>СТАН</span>
          </div>
          ${store.devices.slice(0, 4).map(
            (device) => html`
              <div class="table-row">
                <button
                  class="device-name"
                  @click=${() => Router.go(`/devices/${encodeURIComponent(device.id)}`)}
                >
                  <span class="device-symbol">⌁</span
                  ><span><strong>${device.name}</strong><small>${device.id}</small></span>
                </button>
                <span>${store.zoneName(device.zoneId)}</span>
                <strong
                  >${device.unit === '%' ? (device.currentValue ?? device.humidity) : (device.currentValue ?? device.temperature)}
                  ${device.unit ?? '°C'}</strong
                >
                <strong>${device.humidity}%</strong>
                <span class="status ${device.status}"
                  ><i></i>${this.statusText(device.status)}</span
                >
              </div>
            `,
          )}
        </div>
      </section>
    `;
  }

  private statusText(status: string) {
    return status === 'online'
      ? 'На зв’язку'
      : status === 'offline'
        ? 'Не в мережі'
        : 'Неактивний';
  }

  static styles = css`
    :host {
      display: block;
    }
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 25px;
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
    .live-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 4px;
      color: #688073;
      font-size: 10px;
    }
    .live-badge span,
    .tiny-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #62bd7a;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 15px;
      margin-bottom: 17px;
    }
    .metric,
    .panel {
      border: 1px solid #e8ede9;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 2px 6px #17301a08;
    }
    .metric {
      padding: 17px 18px 15px;
    }
    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #75837a;
      font-size: 10px;
    }
    .metric-icon {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 7px;
      font-size: 16px;
    }
    .devices {
      color: #438859;
      background: #eaf5ed;
    }
    .online {
      color: #478da0;
      background: #eaf5f7;
    }
    .warning {
      color: #b9843e;
      background: #fcf4e7;
    }
    .alerts {
      color: #b86b55;
      background: #fbefec;
    }
    .metric-number {
      margin-top: 12px;
      color: #203329;
      font-size: 27px;
      font-weight: 700;
      letter-spacing: -1px;
    }
    .metric-total {
      color: #86938b;
      font-size: 10px;
      font-weight: 450;
      letter-spacing: 0;
    }
    .metric-foot {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 9px;
      color: #849087;
      font-size: 9px;
    }
    .tiny-dot {
      width: 5px;
      height: 5px;
    }
    .tiny-dot.orange {
      background: #e1a34e;
    }
    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(310px, 1fr);
      gap: 16px;
      margin-bottom: 17px;
    }
    .panel {
      padding: 18px 20px;
    }
    .panel-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    h2 {
      margin: 0;
      color: #26392d;
      font-size: 13px;
      letter-spacing: -0.2px;
    }
    .panel-heading p {
      margin: 5px 0 0;
      color: #8a968e;
      font-size: 9px;
    }
    .period {
      padding: 7px 9px;
      border: 1px solid #e7ece8;
      border-radius: 6px;
      color: #66766b;
      font-size: 9px;
    }
    .period span {
      padding-left: 12px;
      color: #87938c;
    }
    .chart-summary {
      display: flex;
      align-items: baseline;
      gap: 9px;
      margin-top: 17px;
    }
    .chart-summary strong {
      color: #20382b;
      font-size: 23px;
      letter-spacing: -0.7px;
    }
    .chart-summary span {
      color: #8c9890;
      font-size: 9px;
    }
    .chart-summary .trend {
      color: #4e9d66;
      font-weight: 650;
    }
    .chart {
      position: relative;
      height: 155px;
      margin-top: 8px;
      padding-left: 30px;
    }
    .chart svg {
      width: 100%;
      height: 125px;
      overflow: visible;
    }
    .gridline {
      fill: none;
      stroke: #edf1ee;
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .y-labels {
      position: absolute;
      top: 0;
      bottom: 26px;
      left: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #a2ada5;
      font-size: 8px;
    }
    .x-labels {
      display: flex;
      justify-content: space-between;
      color: #a2ada5;
      font-size: 8px;
    }
    .chart-legend {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #69796f;
      font-size: 9px;
    }
    .chart-legend > span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #62bd7c;
    }
    .chart-legend small {
      margin-left: auto;
      color: #a2ada5;
      font-size: 8px;
    }
    .alert-count {
      padding: 5px 7px;
      border-radius: 5px;
      color: #b47436;
      background: #fff5e8;
      font-size: 8px;
    }
    .alert-list {
      margin-top: 12px;
    }
    .alert-row {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 11px 0;
      border-bottom: 1px solid #eff2f0;
    }
    .alert-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 23px;
      height: 23px;
      border-radius: 7px;
      color: #b57838;
      background: #fff5e8;
      font-size: 11px;
      font-weight: 700;
    }
    .acknowledged .alert-icon {
      color: #4e9962;
      background: #edf7ef;
    }
    .alert-copy {
      min-width: 0;
      flex: 1;
    }
    .alert-copy strong,
    .alert-copy span,
    .alert-copy small {
      display: block;
    }
    .alert-copy strong {
      overflow: hidden;
      color: #3b4c41;
      font-size: 9px;
      text-overflow: ellipsis;
    }
    .alert-copy span {
      margin-top: 4px;
      color: #7c8981;
      font-size: 9px;
    }
    .alert-copy small {
      margin-top: 5px;
      color: #a0aaa3;
      font-size: 8px;
    }
    .ack-button {
      flex: none;
      width: 22px;
      height: 22px;
      border: 1px solid #dce9de;
      border-radius: 6px;
      color: #4a9860;
      background: #f8fcf9;
      cursor: pointer;
    }
    .done-label {
      padding-top: 4px;
      color: #71947a;
      font-size: 8px;
    }
    .empty {
      padding: 25px 0;
      color: #8a968e;
      font-size: 10px;
      text-align: center;
    }
    .all-alerts,
    .view-all {
      padding: 0;
      border: 0;
      color: #478b5e;
      background: transparent;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .all-alerts {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 12px;
    }
    .devices-panel {
      padding-bottom: 6px;
    }
    .devices-panel > .panel-heading {
      margin-bottom: 15px;
    }
    .table-head,
    .table-row {
      display: grid;
      grid-template-columns: 2.05fr 1.25fr 1fr 1fr 1.05fr;
      align-items: center;
      gap: 12px;
    }
    .table-head {
      padding: 9px 10px;
      border-radius: 5px;
      color: #9aa59e;
      background: #f7f9f7;
      font-size: 8px;
      font-weight: 650;
      letter-spacing: 0.55px;
    }
    .table-row {
      min-height: 53px;
      padding: 0 10px;
      border-bottom: 1px solid #eff2f0;
      color: #7c8980;
      font-size: 9px;
    }
    .table-row:last-child {
      border-bottom: 0;
    }
    .table-row > strong {
      color: #3d5044;
      font-size: 9px;
      font-weight: 600;
    }
    .device-name {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
      padding: 0;
      border: 0;
      color: inherit;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }
    .device-symbol {
      display: grid;
      place-items: center;
      width: 27px;
      height: 27px;
      border-radius: 7px;
      color: #4f9965;
      background: #edf7ef;
      font-size: 17px;
    }
    .device-name strong,
    .device-name small {
      display: block;
    }
    .device-name strong {
      overflow: hidden;
      color: #3a4b40;
      font-size: 9px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .device-name small {
      margin-top: 4px;
      color: #9ba59e;
      font-size: 8px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .status i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #56b777;
    }
    .status.offline i {
      background: #e2a14b;
    }
    .status.inactive i {
      background: #9ba59e;
    }
    @media (max-width: 1200px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
      .metrics {
        gap: 10px;
      }
      .metric {
        padding-inline: 13px;
      }
    }
    @media (max-width: 1024px) {
      .table-head,
      .table-row {
        grid-template-columns: 1.8fr 1.1fr 1fr 1fr 1fr;
        gap: 6px;
      }
      .table-row,
      .table-head {
        padding-inline: 5px;
      }
    }
  `;
}
