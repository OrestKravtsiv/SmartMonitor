import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createDevice, updateDevice } from '../api';
import type { Device } from '../model';
import { store } from '../store';

@customElement('device-form')
export class DeviceForm extends LitElement {
  @property({ attribute: false }) device?: Device;
  @state() private busy = false;
  @state() private errorMessage = '';

  private async submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const id = String(data.get('id') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    const zoneId = String(data.get('zoneId') ?? '');
    const type = String(data.get('type') ?? '');
    const thresholdMin = Number(data.get('thresholdMin'));
    const thresholdMax = Number(data.get('thresholdMax'));

    if (!name || !/^[A-Za-z0-9_-]{3,64}$/.test(id) || !zoneId || !type) {
      this.errorMessage =
        'Перевірте введені дані. ID: латиниця, цифри, дефіс або підкреслення (3–64 символи).';
      return;
    }
    if (!this.device && store.devices.some((device) => device.id === id)) {
      this.errorMessage = 'Пристрій із таким ідентифікатором уже існує.';
      return;
    }
    if (
      !Number.isFinite(thresholdMin) ||
      !Number.isFinite(thresholdMax) ||
      thresholdMin >= thresholdMax
    ) {
      this.errorMessage = 'Мінімальний поріг має бути меншим за максимальний.';
      return;
    }

    this.busy = true;
    this.errorMessage = '';
    const previous = this.device;
    const updated: Device = {
      ...(previous ?? {
        id,
        status: 'inactive',
        lastSeen: 'ще не підключався',
        temperature: 0,
        humidity: 0,
      }),
      id,
      name,
      zoneId,
      type,
      sensorType: type,
      thresholdMin,
      thresholdMax,
      unit: type.toLocaleLowerCase('uk').includes('волог') ? '%' : '°C',
    };

    try {
      if (previous) {
        await updateDevice(updated);
        this.dispatchEvent(
          new CustomEvent('device-form-close', { bubbles: true, composed: true }),
        );
      } else {
        const result = await createDevice(updated);
        this.dispatchEvent(
          new CustomEvent('device-form-created', {
            detail: result.deviceSecret,
            bubbles: true,
            composed: true,
          }),
        );
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося зберегти пристрій.';
      console.error('Не вдалося зберегти дані пристрою', error);
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`
      <form @submit=${this.submit}>
        <div class="form-head">
          <div>
            <span class="eyebrow"
              >${this.device ? 'НАЛАШТУВАННЯ' : 'НОВИЙ ПРИСТРІЙ'}</span
            >
            <h2>${this.device ? 'Редагувати пристрій' : 'Додати пристрій'}</h2>
          </div>
          <button type="button" class="close" @click=${this.close} aria-label="Закрити">
            ×
          </button>
        </div>
        <p class="description">
          ${
            this.device
              ? 'Оновіть параметри або порогові значення пристрою.'
              : 'Зареєструйте IoT-пристрій, задайте пороги та прив’яжіть його до зони.'
          }
        </p>
        <label for="device-id">Ідентифікатор</label>
        <input
          id="device-id"
          name="id"
          placeholder="SM-1046"
          pattern="(?:[A-Za-z0-9_]|-){3,64}"
          minlength="3"
          maxlength="64"
          .value=${this.device?.id ?? ''}
          ?readonly=${Boolean(this.device)}
          required
        />
        <label for="device-name">Назва пристрою</label>
        <input
          id="device-name"
          name="name"
          placeholder="Наприклад, Датчик температури 03"
          .value=${this.device?.name ?? ''}
          maxlength="100"
          required
        />
        <label for="device-type">Тип пристрою</label>
        <select
          id="device-type"
          name="type"
          .value=${this.device?.sensorType ?? this.device?.type ?? 'Температура та вологість'}
          required
        >
          <option value="Температура та вологість">Температура та вологість</option>
          <option value="Датчик вологості ґрунту">Датчик вологості ґрунту</option>
          <option value="Датчик якості повітря">Датчик якості повітря</option>
        </select>
        <label for="device-zone">Зона</label>
        <select
          id="device-zone"
          name="zoneId"
          .value=${this.device?.zoneId ?? store.zones[0]?.id ?? ''}
          required
        >
          ${store.zones.map((zone) => html`<option value=${zone.id}>${zone.name}</option>`)}
        </select>
        <div class="reading-inputs">
          <div>
            <label for="threshold-min">Мінімальний поріг</label>
            <input
              id="threshold-min"
              name="thresholdMin"
              type="number"
              step="0.1"
              .value=${String(this.device?.thresholdMin ?? 10)}
              required
            />
          </div>
          <div>
            <label for="threshold-max">Максимальний поріг</label>
            <input
              id="threshold-max"
              name="thresholdMax"
              type="number"
              step="0.1"
              .value=${String(this.device?.thresholdMax ?? 35)}
              required
            />
          </div>
        </div>
        ${this.errorMessage ? html`<div class="error" role="alert">${this.errorMessage}</div>` : ''}
        <div class="actions">
          <button type="button" class="cancel" @click=${this.close}>Скасувати</button>
          <button type="submit" class="submit" ?disabled=${this.busy}>
            ${
              this.busy
                ? 'Збереження…'
                : this.device
                  ? 'Зберегти зміни'
                  : 'Додати пристрій'
            }
          </button>
        </div>
      </form>
    `;
  }

  private close() {
    this.dispatchEvent(
      new CustomEvent('device-form-close', { bubbles: true, composed: true }),
    );
  }

  static styles = css`
    :host {
      display: block;
    }
    form {
      display: grid;
      gap: 9px;
    }
    .form-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .eyebrow {
      color: #5a9b6d;
      font-size: 8px;
      font-weight: 750;
      letter-spacing: 1px;
    }
    h2 {
      margin: 6px 0 0;
      color: #26382d;
      font-size: 19px;
    }
    .description {
      margin: 0 0 9px;
      color: #7f8c83;
      font-size: 10px;
      line-height: 1.55;
    }
    .close {
      width: 27px;
      height: 27px;
      border: 0;
      border-radius: 6px;
      color: #76837a;
      background: #f3f6f3;
      font-size: 19px;
      cursor: pointer;
    }
    label {
      color: #405247;
      font-size: 9px;
      font-weight: 650;
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      height: 38px;
      margin: -3px 0 4px;
      padding: 0 10px;
      border: 1px solid #e1e8e3;
      border-radius: 6px;
      color: #36473c;
      background: white;
      font: inherit;
      font-size: 10px;
    }
    input:focus,
    select:focus {
      outline: 2px solid #92d4a2;
      outline-offset: 1px;
    }
    .reading-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .reading-inputs input {
      margin-top: 7px;
    }
    .error {
      padding: 9px;
      border-radius: 5px;
      color: #a33;
      background: #fff0ef;
      font-size: 9px;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 7px;
    }
    .actions button {
      min-height: 35px;
      padding: 0 13px;
      border-radius: 6px;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    .cancel {
      border: 1px solid #e1e8e3;
      color: #66756b;
      background: white;
    }
    .submit {
      border: 1px solid #1e5b39;
      color: white;
      background: #1e5b39;
      font-weight: 600;
    }
    .submit:disabled {
      opacity: 0.6;
      cursor: wait;
    }
  `;
}
