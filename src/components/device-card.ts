import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import type { Device } from '../model';
import { store } from '../store';

@customElement('device-card')
export class DeviceCard extends LitElement {
  @property({ attribute: false }) device?: Device;

  private edit() {
    if (!this.device) return;
    this.dispatchEvent(
      new CustomEvent('device-edit', {
        detail: this.device,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private deleteDevice() {
    if (!this.device) return;
    this.dispatchEvent(
      new CustomEvent('device-delete', {
        detail: this.device,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.device) return html``;
    const status = this.device.status;
    const label =
      status === 'online'
        ? 'На зв’язку'
        : status === 'offline'
          ? 'Не в мережі'
          : 'Неактивний';

    return html`
      <article class="card">
        <div class="card-head">
          <div class="device-icon">⌁</div>
          <span class="status ${status}"><i></i>${label}</span>
          <button
            class="more"
            aria-label="Дії з пристроєм"
            title="Відкрити пристрій"
            @click=${() => Router.go(`/devices/${encodeURIComponent(this.device!.id)}`)}
          >
            ↗
          </button>
        </div>
        <h3>${this.device.name}</h3>
        <div class="device-id">${this.device.id} <span>·</span> ${this.device.type}</div>
        <div class="readings">
          <div>
            <small>Температура</small
            ><strong>${this.device.temperature.toFixed(1)}<span> °C</span></strong>
          </div>
          <div>
            <small>Вологість</small
            ><strong>${this.device.humidity}<span> %</span></strong>
          </div>
        </div>
        <div class="card-foot">
          <span>⌖ ${store.zoneName(this.device.zoneId)}</span
          ><span>◷ ${this.device.lastSeen}</span>
        </div>
        <div class="card-actions">
          <button
            @click=${() => Router.go(`/devices/${encodeURIComponent(this.device!.id)}`)}
          >
            Деталі
          </button>
          ${
            store.user?.role === 'admin'
              ? html`<button @click=${this.edit}>Редагувати</button
                  ><button class="delete" @click=${this.deleteDevice}>Видалити</button>`
              : ''
          }
        </div>
      </article>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .card {
      padding: 17px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: white;
      box-shadow: 0 2px 6px #17301a08;
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .device-icon {
      display: grid;
      place-items: center;
      width: 33px;
      height: 33px;
      border-radius: 8px;
      color: #4e9864;
      background: #edf7ef;
      font-size: 20px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 7px;
      border-radius: 5px;
      color: #418c57;
      background: #eff8f0;
      font-size: 8px;
    }
    .status i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #56b777;
    }
    .status.offline {
      color: #a57939;
      background: #fff7e9;
    }
    .status.offline i {
      background: #dca045;
    }
    .status.inactive {
      color: #78847c;
      background: #f1f3f1;
    }
    .status.inactive i {
      background: #9aa39c;
    }
    .more {
      margin-left: auto;
      border: 0;
      color: #8b978f;
      background: transparent;
      font-size: 19px;
      cursor: pointer;
    }
    h3 {
      margin: 17px 0 5px;
      color: #2a3b30;
      font-size: 12px;
    }
    .device-id {
      color: #919c94;
      font-size: 8px;
    }
    .device-id span {
      padding: 0 3px;
    }
    .readings {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 17px;
      padding: 12px 0;
      border-top: 1px solid #eff2f0;
      border-bottom: 1px solid #eff2f0;
    }
    .readings small,
    .readings strong {
      display: block;
    }
    .readings small {
      color: #8a968e;
      font-size: 8px;
    }
    .readings strong {
      margin-top: 7px;
      color: #355441;
      font-size: 17px;
    }
    .readings strong span {
      color: #86938a;
      font-size: 9px;
      font-weight: 450;
    }
    .card-foot {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin-top: 12px;
      color: #829087;
      font-size: 8px;
    }
    .card-actions {
      display: flex;
      gap: 6px;
      margin-top: 11px;
      padding-top: 9px;
      border-top: 1px solid #eff2f0;
    }
    .card-actions button {
      padding: 5px 7px;
      border: 1px solid #e4ebe5;
      border-radius: 4px;
      color: #5c7563;
      background: white;
      font: inherit;
      font-size: 8px;
      cursor: pointer;
    }
    .card-actions button:hover {
      background: #f4faf5;
    }
    .card-actions .delete {
      margin-left: auto;
      color: #a84940;
      border-color: #f0ddda;
    }
  `;
}
