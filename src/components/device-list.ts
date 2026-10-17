import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { listDevices, listZones, removeDevice } from '../api';
import type { Device } from '../model';
import { store } from '../store';

@customElement('device-list')
export class DeviceList extends LitElement {
  @state() private revision = 0;
  @state() private showForm = false;
  @state() private selectedDevice?: Device;
  @state() private secret = '';
  @state() private copied = false;
  @state() private loading = true;
  @state() private errorMessage = '';
  @state() private zoneFilter = '';
  @state() private search = '';
  @state() private statusFilter = 'all';

  private readonly refresh = () => {
    this.revision += 1;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
    void this.loadDevices();
  }

  private async loadDevices() {
    this.loading = true;
    try {
      await Promise.all([listDevices(this.zoneFilter || undefined), listZones()]);
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося завантажити пристрої.';
      console.error('Не вдалося завантажити список пристроїв', error);
    } finally {
      this.loading = false;
    }
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    super.disconnectedCallback();
  }

  private get filteredDevices(): Device[] {
    const query = this.search.toLocaleLowerCase('uk');
    return store.devices.filter((device) => {
      const matchesText =
        device.name.toLocaleLowerCase('uk').includes(query) ||
        device.id.toLocaleLowerCase('uk').includes(query) ||
        store.zoneName(device.zoneId).toLocaleLowerCase('uk').includes(query);
      return (
        matchesText &&
        (this.statusFilter === 'all' || device.status === this.statusFilter) &&
        (!this.zoneFilter || device.zoneId === this.zoneFilter)
      );
    });
  }

  render() {
    void this.revision;
    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">КЕРУВАННЯ ІНФРАСТРУКТУРОЮ</div>
          <h1>Пристрої</h1>
          <p>Переглядайте стан і показники IoT-пристроїв.</p>
        </div>
        ${
          store.user?.role === 'admin'
            ? html`<button
                class="primary"
                @click=${() => {
                  this.selectedDevice = undefined;
                  this.showForm = true;
                }}
              >
                <span>＋</span> Додати пристрій
              </button>`
            : ''
        }
      </div>
      <section class="summary">
        <div><span>Усього пристроїв</span><strong>${store.devices.length}</strong></div>
        <div>
          <span>На зв’язку</span
          ><strong class="green"
            >${store.devices.filter((device) => device.status === 'online').length}</strong
          >
        </div>
        <div>
          <span>Не в мережі</span
          ><strong class="orange"
            >${store.devices.filter((device) => device.status === 'offline').length}</strong
          >
        </div>
        <div>
          <span>Неактивні</span
          ><strong class="muted"
            >${store.devices.filter((device) => device.status === 'inactive').length}</strong
          >
        </div>
      </section>
      <section class="toolbar">
        <div class="search">
          <span>⌕</span
          ><input
            aria-label="Пошук пристроїв"
            placeholder="Пошук пристрою або зони…"
            .value=${this.search}
            @input=${(event: Event) => (this.search = (event.target as HTMLInputElement).value)}
          />
        </div>
        <select
          aria-label="Фільтр за станом"
          .value=${this.statusFilter}
          @change=${(event: Event) => (this.statusFilter = (event.target as HTMLSelectElement).value)}
        >
          <option value="all">Усі стани</option>
          <option value="online">На зв’язку</option>
          <option value="offline">Не в мережі</option>
          <option value="inactive">Неактивні</option>
        </select>
        <select
          aria-label="Фільтр за зоною"
          .value=${this.zoneFilter}
          @change=${(event: Event) => {
            this.zoneFilter = (event.target as HTMLSelectElement).value;
            void this.loadDevices();
          }}
        >
          <option value="">Усі зони</option>
          ${store.zones.map((zone) => html`<option value=${zone.id}>${zone.name}</option>`)}
        </select>
      </section>
      ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
      <div class="results">
        Показано <strong>${this.filteredDevices.length}</strong> із
        ${store.devices.length} пристроїв
      </div>
      <section class="cards">
        ${this.filteredDevices.map(
          (device) =>
            html`<device-card
              .device=${device}
              @device-edit=${(event: CustomEvent<Device>) => {
                this.selectedDevice = event.detail;
                this.showForm = true;
              }}
              @device-delete=${(event: CustomEvent<Device>) => void this.deleteDevice(event.detail)}
            ></device-card>`,
        )}
        ${this.loading ? html`<div class="empty">Завантаження пристроїв…</div>` : ''}
        ${!this.loading && this.filteredDevices.length === 0 ? html`<div class="empty">Пристроїв за цим запитом не знайдено.</div>` : ''}
      </section>
      ${
        this.showForm
          ? html`<div class="overlay" @click=${this.closeForm}>
              <div
                class="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Додати пристрій"
                @click=${(event: Event) => event.stopPropagation()}
              >
                <device-form
                  .device=${this.selectedDevice}
                  @device-form-close=${this.closeForm}
                  @device-form-created=${(event: CustomEvent<string>) => this.deviceCreated(event.detail)}
                ></device-form>
              </div>
            </div>`
          : ''
      }
      ${
        this.secret
          ? html`<div class="overlay secret-overlay">
              <section
                class="secret-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Секрет пристрою"
              >
                <button
                  class="secret-close"
                  @click=${() => (this.secret = '')}
                  aria-label="Закрити"
                >
                  ×</button
                ><span class="secret-icon">✓</span>
                <h2>Пристрій зареєстровано</h2>
                <p>
                  Скопіюйте секрет зараз і передайте його лише в конфігурацію пристрою.
                  Після закриття секрет більше не буде показано.
                </p>
                <code>${this.secret}</code>
                <div class="secret-actions">
                  <button class="copy" @click=${this.copySecret}>
                    ${this.copied ? 'Скопійовано ✓' : 'Скопіювати секрет'}</button
                  ><button
                    class="done"
                    @click=${() => {
                      this.secret = '';
                      this.copied = false;
                    }}
                  >
                    Готово
                  </button>
                </div>
              </section>
            </div>`
          : ''
      }
    `;
  }

  private closeForm() {
    this.showForm = false;
    this.selectedDevice = undefined;
  }

  private deviceCreated(secret: string) {
    this.secret = secret;
    this.showForm = false;
    this.selectedDevice = undefined;
  }

  private async copySecret() {
    try {
      await navigator.clipboard.writeText(this.secret);
      this.copied = true;
    } catch (error) {
      this.errorMessage =
        'Не вдалося скопіювати секрет. Виділіть і скопіюйте його вручну.';
      console.error('Не вдалося скопіювати секрет пристрою', error);
    }
  }

  private async deleteDevice(device: Device) {
    if (!window.confirm(`Видалити пристрій «${device.name}»?`)) return;
    try {
      await removeDevice(device.id);
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося видалити пристрій.';
      console.error(`Не вдалося видалити пристрій ${device.id}`, error);
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 23px;
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
    .primary {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 37px;
      padding: 0 13px;
      border: 0;
      border-radius: 6px;
      color: white;
      background: #205c39;
      font: inherit;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .primary:hover {
      background: #2b7148;
    }
    .primary span {
      font-size: 17px;
      font-weight: 400;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 13px;
      margin-bottom: 17px;
    }
    .summary > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 57px;
      padding: 0 15px;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: white;
    }
    .summary span {
      color: #78867d;
      font-size: 9px;
    }
    .summary strong {
      color: #34473a;
      font-size: 17px;
    }
    .summary .green {
      color: #4b9b62;
    }
    .summary .orange {
      color: #c18a43;
    }
    .summary .muted {
      color: #8b968f;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      padding: 11px;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: white;
    }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      padding: 0 9px;
      border: 1px solid #e7ede8;
      border-radius: 6px;
      color: #7b8b7f;
    }
    .search span {
      font-size: 19px;
    }
    .search input {
      width: 100%;
      height: 31px;
      border: 0;
      outline: none;
      color: #405146;
      font: inherit;
      font-size: 9px;
    }
    .search input::placeholder {
      color: #a3ada6;
    }
    .toolbar select {
      min-width: 125px;
      padding: 0 9px;
      border: 1px solid #e7ede8;
      border-radius: 6px;
      color: #607067;
      background: white;
      font: inherit;
      font-size: 9px;
    }
    .results {
      margin: 17px 1px 10px;
      color: #829087;
      font-size: 9px;
    }
    .notice {
      margin: 9px 0;
      padding: 9px;
      border-radius: 5px;
      font-size: 9px;
    }
    .notice.error {
      color: #a33;
      background: #fff0ef;
    }
    .results strong {
      color: #405247;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 13px;
    }
    .empty {
      grid-column: 1 / -1;
      padding: 50px 15px;
      border: 1px dashed #dce5de;
      border-radius: 8px;
      color: #819087;
      background: white;
      font-size: 11px;
      text-align: center;
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
      padding: 27px;
      overflow-y: auto;
      background: white;
      box-shadow: -10px 0 30px #10251f22;
    }
    .secret-overlay {
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .secret-dialog {
      position: relative;
      width: min(440px, 100%);
      box-sizing: border-box;
      padding: 27px;
      border-radius: 10px;
      background: white;
      box-shadow: 0 15px 50px #10251f33;
    }
    .secret-close {
      position: absolute;
      top: 12px;
      right: 13px;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: 5px;
      color: #718077;
      background: #f1f5f2;
      font-size: 18px;
      cursor: pointer;
    }
    .secret-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      color: #458b58;
      background: #edf7ef;
    }
    .secret-dialog h2 {
      margin: 13px 0 7px;
      color: #304337;
      font-size: 16px;
    }
    .secret-dialog p {
      color: #7e8a82;
      font-size: 9px;
      line-height: 1.6;
    }
    .secret-dialog code {
      display: block;
      padding: 11px;
      overflow-wrap: anywhere;
      border-radius: 6px;
      color: #395242;
      background: #f3f7f4;
      font-size: 10px;
    }
    .secret-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
      margin-top: 13px;
    }
    .secret-actions button {
      min-height: 33px;
      padding: 0 10px;
      border: 1px solid #e1e8e3;
      border-radius: 5px;
      color: #617267;
      background: white;
      font: inherit;
      font-size: 8px;
      cursor: pointer;
    }
    .secret-actions .copy {
      color: white;
      border-color: #205c39;
      background: #205c39;
    }
    @media (max-width: 1180px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 1024px) {
      .summary {
        gap: 7px;
      }
      .summary > div {
        padding-inline: 10px;
      }
      .summary span {
        font-size: 8px;
      }
    }
  `;
}
