import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { createZone, listDevices, listZones, removeZone, updateZone } from '../api';
import type { Zone } from '../model';
import { store } from '../store';

@customElement('zone-manager')
export class ZoneManager extends LitElement {
  @state() private revision = 0;
  @state() private showForm = false;
  @state() private errorMessage = '';
  @state() private selectedZone?: Zone;
  @state() private busy = false;

  private readonly refresh = () => {
    this.revision += 1;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.refresh);
    void Promise.all([listZones(), listDevices()]).catch((error: unknown) => {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Не вдалося завантажити зони та пристрої.';
      console.error('Не вдалося завантажити дані зон', error);
    });
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.refresh);
    super.disconnectedCallback();
  }

  private async submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    if (!name) {
      this.errorMessage = 'Вкажіть назву зони.';
      return;
    }
    if (
      store.zones.some(
        (zone) => zone.name.toLocaleLowerCase('uk') === name.toLocaleLowerCase('uk'),
      )
    ) {
      this.errorMessage = 'Зона з такою назвою вже існує.';
      return;
    }
    this.busy = true;
    this.errorMessage = '';
    try {
      if (this.selectedZone) {
        await updateZone(this.selectedZone.id, { name, description });
      } else {
        await createZone({ name, description });
      }
      this.showForm = false;
      this.selectedZone = undefined;
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося зберегти зону.';
      console.error('Не вдалося зберегти зону', error);
    } finally {
      this.busy = false;
    }
  }

  private editZone(zone: Zone) {
    this.selectedZone = zone;
    this.errorMessage = '';
    this.showForm = true;
  }

  private async deleteZone(zone: Zone) {
    const devices = store.devices.filter((device) => device.zoneId === zone.id);
    if (devices.length) {
      this.errorMessage = `Зону «${zone.name}» не можна видалити: до неї прив’язано ${devices.length} пристроїв.`;
      return;
    }
    if (!window.confirm(`Видалити зону «${zone.name}»?`)) return;
    try {
      await removeZone(zone.id);
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося видалити зону.';
      console.error(`Не вдалося видалити зону ${zone.id}`, error);
    }
  }

  render() {
    void this.revision;
    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">ОРГАНІЗАЦІЯ ПРОСТОРУ</div>
          <h1>Зони</h1>
          <p>Групуйте пристрої за приміщеннями та локаціями.</p>
        </div>
        <button
          class="primary"
          @click=${() => {
            this.selectedZone = undefined;
            this.showForm = true;
          }}
        >
          <span>＋</span> Створити зону
        </button>
      </div>
      <div class="zone-summary">
        <span class="summary-icon">⌖</span
        ><span
          ><strong>${store.zones.length} зон</strong
          ><small>У цих зонах розміщено ${store.devices.length} пристроїв</small></span
        >
      </div>
      ${this.errorMessage && !this.showForm ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
      <section class="zone-grid">
        ${store.zones.map((zone, index) => {
          const devices = store.devices.filter((device) => device.zoneId === zone.id);
          return html`
            <article class="zone-card">
              <div class="zone-top">
                <span class="zone-icon"
                  >${index % 3 === 0 ? '⌂' : index % 3 === 1 ? '▤' : '♧'}</span
                ><span class="zone-actions"
                  ><button @click=${() => this.editZone(zone)}>Редагувати</button
                  ><button @click=${() => void this.deleteZone(zone)}>
                    Видалити
                  </button></span
                >
              </div>
              <h2>${zone.name}</h2>
              <p>${zone.description || 'Опис відсутній'}</p>
              <div class="zone-stats">
                <span><strong>${devices.length}</strong> пристроїв</span
                ><span class="mini-status"
                  ><i></i>${devices.filter((device) => device.status === 'online').length}
                  на зв’язку</span
                >
              </div>
              <div class="device-chips">
                ${devices.slice(0, 3).map((device) => html`<span title=${device.name}>${device.name}</span>`)}${devices.length > 3 ? html`<span>+${devices.length - 3}</span>` : ''}${devices.length === 0 ? html`<span class="none">Поки немає пристроїв</span>` : ''}
              </div>
            </article>
          `;
        })}
        <button
          class="add-card"
          @click=${() => {
            this.selectedZone = undefined;
            this.showForm = true;
          }}
        >
          <span>＋</span><strong>Додати нову зону</strong
          ><small>Створіть окрему локацію для пристроїв</small>
        </button>
      </section>
      ${
        this.showForm
          ? html`<div class="overlay" @click=${this.closeForm}>
              <form
                class="dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Створити зону"
                @submit=${this.submit}
                @click=${(event: Event) => event.stopPropagation()}
              >
                <div class="dialog-head">
                  <div>
                    <span class="eyebrow"
                      >${this.selectedZone ? 'НАЛАШТУВАННЯ' : 'НОВА ЛОКАЦІЯ'}</span
                    >
                    <h2>${this.selectedZone ? 'Редагувати зону' : 'Створити зону'}</h2>
                  </div>
                  <button type="button" class="close" @click=${this.closeForm}>×</button>
                </div>
                <p class="form-description">
                  Додайте зону, щоб зручно впорядкувати ваші пристрої.
                </p>
                <label for="zone-name">Назва зони</label
                ><input
                  id="zone-name"
                  name="name"
                  placeholder="Наприклад, Виробничий цех"
                  .value=${this.selectedZone?.name ?? ''}
                  required
                  maxlength="60"
                />
                <label for="zone-description">Опис <span>(необов’язково)</span></label
                ><textarea
                  id="zone-description"
                  name="description"
                  rows="3"
                  placeholder="Короткий опис призначення зони"
                  .value=${this.selectedZone?.description ?? ''}
                  maxlength="180"
                ></textarea>
                ${this.errorMessage ? html`<div class="error" role="alert">${this.errorMessage}</div>` : ''}
                <div class="form-actions">
                  <button type="button" class="cancel" @click=${this.closeForm}>
                    Скасувати</button
                  ><button type="submit" class="primary" ?disabled=${this.busy}>
                    ${this.busy ? 'Збереження…' : this.selectedZone ? 'Зберегти зміни' : 'Створити зону'}
                  </button>
                </div>
              </form>
            </div>`
          : ''
      }
    `;
  }

  private closeForm() {
    this.showForm = false;
    this.errorMessage = '';
    this.selectedZone = undefined;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 36px;
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
    .primary span {
      font-size: 16px;
      font-weight: 400;
    }
    .zone-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 19px;
      padding: 13px 16px;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: white;
    }
    .summary-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      color: #4e9663;
      background: #edf7ef;
      font-size: 19px;
    }
    .zone-summary strong,
    .zone-summary small {
      display: block;
    }
    .zone-summary strong {
      color: #34473a;
      font-size: 10px;
    }
    .zone-summary small {
      margin-top: 4px;
      color: #87938b;
      font-size: 9px;
    }
    .zone-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 13px;
    }
    .zone-card,
    .add-card {
      min-height: 180px;
      box-sizing: border-box;
      padding: 16px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: white;
      box-shadow: 0 2px 6px #17301a08;
    }
    .zone-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .zone-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      color: #4d9663;
      background: #edf7ef;
      font-size: 18px;
    }
    .zone-menu {
      color: #8a968e;
      font-size: 19px;
      letter-spacing: 1px;
    }
    .zone-actions {
      display: flex;
      gap: 4px;
    }
    .zone-actions button {
      padding: 4px 6px;
      border: 1px solid #e4ebe5;
      border-radius: 4px;
      color: #617367;
      background: #fff;
      font: inherit;
      font-size: 7px;
      cursor: pointer;
    }
    .zone-actions button:last-child {
      color: #a84940;
      border-color: #f0ddda;
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
    .zone-card h2 {
      margin: 13px 0 5px;
      color: #304337;
      font-size: 12px;
    }
    .zone-card p {
      min-height: 14px;
      margin: 0;
      color: #87938b;
      font-size: 9px;
    }
    .zone-stats {
      display: flex;
      justify-content: space-between;
      gap: 5px;
      margin-top: 15px;
      padding-top: 11px;
      border-top: 1px solid #eff2f0;
      color: #77857b;
      font-size: 8px;
    }
    .zone-stats strong {
      color: #43574a;
      font-size: 9px;
    }
    .mini-status {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .mini-status i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #60b979;
    }
    .device-chips {
      display: flex;
      gap: 5px;
      margin-top: 9px;
      overflow: hidden;
    }
    .device-chips span {
      overflow: hidden;
      max-width: 120px;
      padding: 4px 6px;
      border-radius: 4px;
      color: #63756a;
      background: #f4f7f4;
      font-size: 7px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .device-chips .none {
      color: #9aa49d;
      background: transparent;
    }
    .add-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-style: dashed;
      color: #5a9b6e;
      cursor: pointer;
      box-shadow: none;
    }
    .add-card > span {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      margin-bottom: 10px;
      border: 1px dashed #a5d3af;
      border-radius: 8px;
      font-size: 18px;
    }
    .add-card strong {
      color: #548d64;
      font-size: 10px;
    }
    .add-card small {
      margin-top: 5px;
      color: #95a098;
      font-size: 8px;
    }
    .overlay {
      position: fixed;
      z-index: 10;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: #15251d66;
    }
    .dialog {
      display: grid;
      gap: 9px;
      width: min(390px, 100%);
      box-sizing: border-box;
      padding: 23px;
      border: 0;
      border-radius: 10px;
      background: white;
      box-shadow: 0 14px 50px #10251f33;
    }
    .dialog-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .dialog-head h2 {
      margin: 5px 0 0;
      color: #2b3d31;
      font-size: 18px;
    }
    .close {
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: 6px;
      color: #718077;
      background: #f1f5f2;
      font-size: 18px;
      cursor: pointer;
    }
    .form-description {
      margin: 0 0 8px;
      color: #7e8a82;
      font-size: 10px;
      line-height: 1.5;
    }
    label {
      color: #405247;
      font-size: 9px;
      font-weight: 650;
    }
    label span {
      color: #96a199;
      font-weight: 400;
    }
    input,
    textarea {
      box-sizing: border-box;
      width: 100%;
      padding: 10px;
      border: 1px solid #e1e8e3;
      border-radius: 6px;
      color: #36473c;
      font: inherit;
      font-size: 10px;
      resize: vertical;
    }
    .error {
      color: #a63333;
      font-size: 9px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 9px;
    }
    .form-actions button {
      min-height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .cancel {
      border: 1px solid #e1e8e3;
      color: #65746a;
      background: white;
    }
    @media (max-width: 1180px) {
      .zone-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;
}
