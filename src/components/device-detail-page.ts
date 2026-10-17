import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import { getDevice, listDevices, listZones, removeDevice } from '../api';
import type { Device } from '../model';
import { store } from '../store';

@customElement('device-detail-page')
export class DeviceDetailPage extends LitElement {
  @state() private device?: Device;
  @state() private loading = true;
  @state() private showEdit = false;
  @state() private errorMessage = '';
  @state() private revision = 0;

  private readonly refresh = () => {
    this.revision += 1;
    const deviceId = this.deviceId;
    if (deviceId) this.device = store.devices.find((device) => device.id === deviceId);
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
    void this.load();
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    super.disconnectedCallback();
  }

  private get deviceId() {
    return decodeURIComponent(window.location.pathname.split('/')[2] ?? '');
  }

  private async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [, device] = await Promise.all([listZones(), getDevice(this.deviceId)]);
      this.device = device;
      if (!this.device) throw new Error('Пристрій не знайдено.');
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося завантажити пристрій.';
      console.error(`Не вдалося завантажити пристрій ${this.deviceId}`, error);
      if (!this.device) {
        try {
          await listDevices();
          this.device = store.devices.find((device) => device.id === this.deviceId);
        } catch (fallbackError) {
          console.error('Не вдалося завантажити список пристроїв', fallbackError);
        }
      }
    } finally {
      this.loading = false;
    }
  }

  private async deleteDevice() {
    if (!this.device || !window.confirm(`Видалити пристрій «${this.device.name}»?`))
      return;
    try {
      await removeDevice(this.device.id);
      Router.go('/devices');
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося видалити пристрій.';
      console.error(`Не вдалося видалити пристрій ${this.device.id}`, error);
    }
  }

  render() {
    void this.revision;
    const device = this.device;
    const unit = device?.unit ?? '°C';
    const current = device
      ? (device.currentValue ?? (unit === '%' ? device.humidity : device.temperature))
      : undefined;

    return html`
      <button class="back" @click=${() => Router.go('/devices')}>← Усі пристрої</button>
      ${
        this.loading
          ? html`<div class="message">Завантаження пристрою…</div>`
          : !device
            ? html`<div class="message error">
                ${this.errorMessage || 'Пристрій не знайдено.'}
              </div>`
            : html`
                <div class="page-head">
                  <div>
                    <div class="eyebrow">КАРТКА ПРИСТРОЮ · ${device.id}</div>
                    <h1>${device.name}</h1>
                    <p>
                      ${device.sensorType ?? device.type} ·
                      ${store.zoneName(device.zoneId)}
                    </p>
                  </div>
                  <div class="actions">
                    <span class="status ${device.status}"
                      ><i></i>${this.statusText(device.status)}</span
                    >
                    ${
                      store.user?.role === 'admin'
                        ? html`<button
                              class="secondary"
                              @click=${() => (this.showEdit = true)}
                            >
                              Редагувати</button
                            ><button class="danger" @click=${this.deleteDevice}>
                              Видалити
                            </button>`
                        : ''
                    }
                  </div>
                </div>
                ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
                <section class="stats">
                  <article>
                    <span>Останнє показання</span
                    ><strong>${current?.toFixed(1) ?? '—'} <small>${unit}</small></strong
                    ><small class="muted">${device.lastSeen}</small>
                  </article>
                  <article>
                    <span>Мінімальний поріг</span
                    ><strong>${device.thresholdMin ?? '—'} <small>${unit}</small></strong
                    ><small class="muted">Нижня межа</small>
                  </article>
                  <article>
                    <span>Максимальний поріг</span
                    ><strong>${device.thresholdMax ?? '—'} <small>${unit}</small></strong
                    ><small class="muted">Верхня межа</small>
                  </article>
                  <article>
                    <span>З’єднання</span
                    ><strong class="connection"
                      >${store.mqttConnected ? 'Активне' : 'Не підключено'}</strong
                    ><small class="muted"
                      >${store.mqttConnected ? 'MQTT over WebSocket' : 'Очікуємо брокер або демо'}</small
                    >
                  </article>
                </section>
                <section class="panel">
                  <div class="panel-head">
                    <div>
                      <h2>Телеметрія в реальному часі</h2>
                      <p>Оновлюється напряму з MQTT без опитування REST API.</p>
                    </div>
                    <span class="live ${store.mqttConnected ? 'connected' : ''}"
                      ><i></i>${store.mqttConnected ? 'LIVE' : 'НЕ ПІДКЛЮЧЕНО'}</span
                    >
                  </div>
                  <live-chart
                    .deviceId=${device.id}
                    .unit=${unit}
                    .label=${device.sensorType ?? device.type}
                  ></live-chart>
                </section>
                <div class="below-actions">
                  <button
                    class="secondary"
                    @click=${() => Router.go(`/devices/${encodeURIComponent(device.id)}/history`)}
                  >
                    Переглянути історію показань →</button
                  ><button
                    class="secondary"
                    @click=${() => Router.go(`/alerts?deviceId=${encodeURIComponent(device.id)}`)}
                  >
                    Сповіщення пристрою →
                  </button>
                </div>
                ${
                  this.showEdit
                    ? html`<div class="overlay" @click=${() => (this.showEdit = false)}>
                        <div
                          class="dialog"
                          role="dialog"
                          aria-modal="true"
                          aria-label="Редагувати пристрій"
                          @click=${(event: Event) => event.stopPropagation()}
                        >
                          <device-form
                            .device=${device}
                            @device-form-close=${() => (this.showEdit = false)}
                          ></device-form>
                        </div>
                      </div>`
                    : ''
                }
              `
      }
    `;
  }

  private statusText(status: Device['status']) {
    if (status === 'online') return 'На зв’язку';
    if (status === 'offline') return 'Не в мережі';
    return 'Неактивний';
  }

  static styles = css`
    :host {
      display: block;
    }
    .back {
      margin: 0 0 19px;
      padding: 0;
      border: 0;
      color: #568b65;
      background: transparent;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 18px;
    }
    .eyebrow {
      margin-bottom: 7px;
      color: #57916a;
      font-size: 8px;
      font-weight: 750;
      letter-spacing: 1.1px;
    }
    h1 {
      margin: 0;
      color: #1b2c22;
      font-size: 25px;
      letter-spacing: -0.7px;
    }
    .page-head p {
      margin: 6px 0 0;
      color: #829087;
      font-size: 10px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-right: 5px;
      padding: 6px 8px;
      border-radius: 5px;
      color: #408953;
      background: #eef8f0;
      font-size: 8px;
      white-space: nowrap;
    }
    .status i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .status.offline {
      color: #a8793d;
      background: #fff6e9;
    }
    .status.inactive {
      color: #748078;
      background: #eff2ef;
    }
    .secondary,
    .danger {
      min-height: 33px;
      padding: 0 10px;
      border: 1px solid #e1e8e3;
      border-radius: 5px;
      color: #5e7064;
      background: white;
      font: inherit;
      font-size: 8px;
      cursor: pointer;
    }
    .danger {
      color: #a84940;
      border-color: #f0ddda;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 11px;
      margin-bottom: 14px;
    }
    .stats article {
      display: grid;
      gap: 6px;
      padding: 13px;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: white;
    }
    .stats article > span {
      color: #78867d;
      font-size: 8px;
    }
    .stats strong {
      color: #304a39;
      font-size: 18px;
    }
    .stats strong small {
      color: #839087;
      font-size: 9px;
      font-weight: 450;
    }
    .muted {
      color: #9aa49d;
      font-size: 8px;
    }
    .stats .connection {
      color: #56785f;
      font-size: 14px;
    }
    .panel {
      padding: 16px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: white;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      margin-bottom: 17px;
    }
    .panel h2 {
      margin: 0;
      color: #34483a;
      font-size: 12px;
    }
    .panel p {
      margin: 5px 0 0;
      color: #87938b;
      font-size: 8px;
    }
    .live {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #87938b;
      font-size: 7px;
    }
    .live i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #a1aaa4;
    }
    .live.connected {
      color: #4c9561;
    }
    .live.connected i {
      background: #58b675;
    }
    .below-actions {
      display: flex;
      gap: 8px;
      margin-top: 13px;
    }
    .overlay {
      position: fixed;
      z-index: 10;
      inset: 0;
      display: flex;
      justify-content: flex-end;
      background: #15251d66;
    }
    .dialog {
      width: min(390px, 100%);
      height: 100%;
      box-sizing: border-box;
      padding: 25px;
      overflow: auto;
      background: white;
    }
    .message {
      padding: 45px;
      color: #819087;
      font-size: 11px;
      text-align: center;
    }
    .message.error {
      color: #a33;
    }
    .notice {
      margin: 0 0 12px;
      padding: 9px;
      border-radius: 5px;
      font-size: 9px;
    }
    .notice.error {
      color: #a33;
      background: #fff0ef;
    }
  `;
}
