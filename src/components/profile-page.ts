import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { isFirebaseConfigured } from '../auth';
import { enablePushNotifications } from '../notifications';
import { store } from '../store';

@customElement('profile-page')
export class ProfilePage extends LitElement {
  @state() private busy = false;
  @state() private message = '';
  @state() private errorMessage = '';

  private async enableNotifications() {
    this.busy = true;
    this.message = '';
    this.errorMessage = '';
    try {
      await enablePushNotifications();
      this.message = 'Push-сповіщення увімкнено для цього браузера.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося увімкнути сповіщення.';
      console.error('Не вдалося зареєструвати push-сповіщення', error);
    } finally {
      this.busy = false;
    }
  }

  render() {
    const user = store.user;
    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">ОБЛІКОВИЙ ЗАПИС</div>
          <h1>Мій профіль</h1>
          <p>Інформація про ваш сеанс і налаштування сповіщень.</p>
        </div>
      </div>
      <section class="profile-card">
        <div class="avatar">${user?.email.slice(0, 1).toUpperCase()}</div>
        <div class="identity">
          <h2>${user?.email}</h2>
          <span class="role"
            >${user?.role === 'admin' ? 'Адміністратор' : 'Оператор'}</span
          >
        </div>
        <span class="signed-in"><i></i> У системі</span>
        <dl>
          <dt>Електронна пошта</dt>
          <dd>${user?.email}</dd>
          <dt>Ідентифікатор користувача</dt>
          <dd>${user?.uid ?? 'Демо-сеанс'}</dd>
          <dt>Спосіб входу</dt>
          <dd>
            ${isFirebaseConfigured ? 'Firebase Authentication' : 'Локальний демо-режим'}
          </dd>
        </dl>
      </section>
      <section class="notifications">
        <div class="notification-icon">♧</div>
        <div class="notification-text">
          <h2>Push-сповіщення</h2>
          <p>
            Отримуйте повідомлення в браузері, коли спрацює порогове значення пристрою.
          </p>
          <span
            >${'Notification' in window ? `Дозвіл браузера: ${Notification.permission === 'granted' ? 'надано' : Notification.permission === 'denied' ? 'заборонено' : 'не запитували'}` : 'Браузер не підтримує push-повідомлення'}</span
          >
        </div>
        <button
          ?disabled=${this.busy || !isFirebaseConfigured}
          @click=${this.enableNotifications}
        >
          ${this.busy ? 'Увімкнення…' : 'Увімкнути'}
        </button>
      </section>
      ${this.message ? html`<div class="notice" role="status">${this.message}</div>` : ''}
      ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
      ${!isFirebaseConfigured ? html`<p class="demo-note">Push-повідомлення активуються після налаштування Firebase та VAPID-ключа.</p>` : ''}
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .page-head {
      margin-bottom: 20px;
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
    .profile-card {
      position: relative;
      display: grid;
      grid-template-columns: 48px 1fr auto;
      align-items: center;
      gap: 13px;
      max-width: 700px;
      padding: 20px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: white;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: #3f8354;
      background: #edf7ef;
      font-weight: 700;
    }
    .identity h2 {
      margin: 0 0 6px;
      color: #34483a;
      font-size: 13px;
    }
    .role {
      padding: 4px 7px;
      border-radius: 4px;
      color: #4b855a;
      background: #edf7ef;
      font-size: 8px;
    }
    .signed-in {
      color: #559767;
      font-size: 8px;
    }
    .signed-in i {
      display: inline-block;
      width: 5px;
      height: 5px;
      margin-right: 5px;
      border-radius: 50%;
      background: #5cba76;
    }
    .profile-card dl {
      display: grid;
      grid-column: 1/-1;
      grid-template-columns: 180px 1fr;
      gap: 10px;
      margin: 14px 0 0;
      padding-top: 15px;
      border-top: 1px solid #edf1ee;
      font-size: 9px;
    }
    .profile-card dt {
      color: #89958d;
    }
    .profile-card dd {
      margin: 0;
      overflow-wrap: anywhere;
      color: #46584b;
    }
    .notifications {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 700px;
      margin-top: 13px;
      padding: 15px;
      border: 1px solid #e7ede8;
      border-radius: 9px;
      background: white;
    }
    .notification-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: none;
      border-radius: 8px;
      color: #4d9461;
      background: #edf7ef;
      font-size: 18px;
    }
    .notification-text {
      flex: 1;
    }
    .notification-text h2 {
      margin: 0;
      color: #34483a;
      font-size: 11px;
    }
    .notification-text p {
      margin: 5px 0;
      color: #7f8c83;
      font-size: 9px;
    }
    .notification-text span {
      color: #929e95;
      font-size: 8px;
    }
    .notifications button {
      min-height: 31px;
      padding: 0 10px;
      border: 0;
      border-radius: 5px;
      color: white;
      background: #205c39;
      font: inherit;
      font-size: 8px;
      cursor: pointer;
    }
    .notifications button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .notice {
      max-width: 700px;
      margin-top: 12px;
      padding: 9px;
      border-radius: 5px;
      color: #477b55;
      background: #f0f8f1;
      font-size: 9px;
    }
    .notice.error {
      color: #a33;
      background: #fff0ef;
    }
    .demo-note {
      color: #87938b;
      font-size: 9px;
    }
  `;
}
