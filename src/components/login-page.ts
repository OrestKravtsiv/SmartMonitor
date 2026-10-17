import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import { isFirebaseConfigured, register, signIn } from '../auth';
import { ensureUserProfile } from '../api';
import type { UserRole } from '../model';

@customElement('login-page')
export class LoginPage extends LitElement {
  @state() private mode: 'login' | 'register' = 'login';
  @state() private busy = false;
  @state() private errorMessage = '';
  @state() private demoRole: UserRole = 'operator';

  private async submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    this.errorMessage = '';
    this.busy = true;

    try {
      if (this.mode === 'register') {
        await register(email, password);
      } else {
        await signIn(email, password, this.demoRole);
      }
      await ensureUserProfile();
      Router.go('/dashboard');
    } catch (error) {
      console.error('Не вдалося виконати автентифікацію', error);
      this.errorMessage = this.authErrorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`
      <div class="login-layout">
        <section class="intro">
          <a class="brand" href="/login">
            <span class="brand-mark"
              ><svg viewBox="0 0 24 24"><path d="M3 13h4l3-8 4 14 3-8h4" /></svg
            ></span>
            smart<span>monitor</span>
          </a>
          <div class="intro-copy">
            <div class="eyebrow"><span></span> МОНІТОРИНГ ІОТ У РЕАЛЬНОМУ ЧАСІ</div>
            <h1>Ваші дані.<br />Під повним<br /><em>контролем.</em></h1>
            <p>
              Єдиний простір для моніторингу пристроїв, зон і показників вашої системи.
            </p>
          </div>
          <div class="intro-footer">
            <span>НАДІЙНИЙ МОНІТОРИНГ</span>
            <span>SMARTMONITOR © 2026</span>
          </div>
          <div class="orb orb-one"></div>
          <div class="orb orb-two"></div>
        </section>
        <section class="form-side">
          <div class="form-wrap">
            <div class="mobile-brand">SMARTMONITOR</div>
            <div class="form-heading">
              <div class="overline">
                ${this.mode === 'login' ? 'З РАДІСТЮ ЗНОВУ БАЧИМО' : 'ПОЧНІМО РАЗОМ'}
              </div>
              <h2>${this.mode === 'login' ? 'Вітаємо!' : 'Створіть акаунт'}</h2>
              <p>
                ${this.mode === 'login' ? 'Увійдіть до свого робочого простору' : 'Зареєструйтеся, щоб почати роботу'}
              </p>
            </div>
            <div class="tabs" role="tablist" aria-label="Тип автентифікації">
              <button
                class=${this.mode === 'login' ? 'selected' : ''}
                role="tab"
                aria-selected=${this.mode === 'login'}
                @click=${() => this.setMode('login')}
              >
                Вхід
              </button>
              <button
                class=${this.mode === 'register' ? 'selected' : ''}
                role="tab"
                aria-selected=${this.mode === 'register'}
                @click=${() => this.setMode('register')}
              >
                Реєстрація
              </button>
            </div>
            <form @submit=${this.submit}>
              <label for="email">Електронна пошта</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                autocomplete="email"
                required
              />
              <div class="password-label">
                <label for="password">Пароль</label>
                ${this.mode === 'login' ? html`<button type="button" class="text-link" @click=${() => (this.errorMessage = 'Для відновлення пароля зверніться до адміністратора системи.')}>Забули пароль?</button>` : ''}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Не менше 6 символів"
                minlength="6"
                autocomplete=${this.mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              ${
                !isFirebaseConfigured && this.mode === 'login'
                  ? html`
                      <label for="role">Демо-роль</label>
                      <select
                        id="role"
                        .value=${this.demoRole}
                        @change=${(event: Event) => (this.demoRole = (event.target as HTMLSelectElement).value as UserRole)}
                      >
                        <option value="operator">Оператор</option>
                        <option value="admin">Адміністратор</option>
                      </select>
                    `
                  : ''
              }
              ${this.errorMessage ? html`<div class="error" role="alert">${this.errorMessage}</div>` : ''}
              <button class="submit" type="submit" ?disabled=${this.busy}>
                ${this.busy ? 'Зачекайте…' : this.mode === 'login' ? 'Увійти до системи' : 'Створити акаунт'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <div class="security-note">
              <span class="lock">▣</span> Ваші дані захищені та зашифровані
            </div>
            ${!isFirebaseConfigured ? html`<div class="demo-note"><strong>Демо-режим</strong><span>Введіть будь-яку пошту та пароль, щоб продовжити.</span></div>` : ''}
          </div>
          <div class="form-footer">
            Потрібна допомога?
            <a href="mailto:support@smartmonitor.local">Зв’яжіться з нами</a>
          </div>
        </section>
      </div>
    `;
  }

  private setMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.errorMessage = '';
  }

  private authErrorMessage(error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
    const messages: Record<string, string> = {
      'auth/invalid-credential': 'Неправильна електронна пошта або пароль.',
      'auth/user-not-found': 'Обліковий запис із такою поштою не знайдено.',
      'auth/wrong-password': 'Неправильна електронна пошта або пароль.',
      'auth/email-already-in-use': 'Ця електронна пошта вже зареєстрована.',
      'auth/weak-password': 'Пароль має містити щонайменше 6 символів.',
      'auth/invalid-email': 'Перевірте правильність електронної пошти.',
      'auth/too-many-requests': 'Забагато спроб. Спробуйте трохи пізніше.',
      'auth/network-request-failed': 'Помилка мережі. Перевірте підключення.',
      'auth/operation-not-allowed':
        'Цей спосіб входу не увімкнено в налаштуваннях Firebase.',
    };
    return messages[code] ?? 'Не вдалося виконати запит. Спробуйте ще раз.';
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      color: #1d2d25;
    }
    .login-layout {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(420px, 47%) 1fr;
    }
    .intro {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 37px 52px 30px;
      color: white;
      background: #122b22;
    }
    .brand {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      color: white;
      text-decoration: none;
      font-size: 18px;
      font-weight: 750;
      letter-spacing: -0.6px;
    }
    .brand > span:not(.brand-mark) {
      color: #82d5a0;
      margin-left: -10px;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: #73cf90;
    }
    .brand-mark svg {
      width: 22px;
      fill: none;
      stroke: #133425;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .intro-copy {
      position: relative;
      z-index: 1;
      width: 400px;
      max-width: 100%;
      margin: auto 0;
      padding-bottom: 38px;
    }
    .eyebrow,
    .overline {
      color: #91cda2;
      font-size: 9px;
      font-weight: 750;
      letter-spacing: 1.45px;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .eyebrow span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #81d69c;
      box-shadow: 0 0 12px #81d69c;
    }
    h1 {
      margin: 24px 0 17px;
      font-size: clamp(46px, 5vw, 67px);
      line-height: 1.05;
      letter-spacing: -3.3px;
      font-weight: 600;
    }
    h1 em {
      color: #7ed69c;
      font-style: normal;
    }
    .intro-copy p {
      max-width: 335px;
      margin: 0;
      color: #afc0b5;
      font-size: 14px;
      line-height: 1.75;
    }
    .intro-footer {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      color: #789285;
      font-size: 8px;
      letter-spacing: 1.05px;
    }
    .orb {
      position: absolute;
      border: 1px solid #29483a;
      border-radius: 50%;
      pointer-events: none;
    }
    .orb-one {
      width: 540px;
      height: 540px;
      top: 16%;
      right: -390px;
    }
    .orb-two {
      width: 375px;
      height: 375px;
      top: 26%;
      right: -307px;
      border-color: #315440;
    }
    .form-side {
      position: relative;
      display: grid;
      place-items: center;
      padding: 45px 60px 84px;
      background: #fff;
    }
    .form-wrap {
      width: min(100%, 385px);
    }
    .form-heading {
      margin-bottom: 27px;
    }
    .overline {
      color: #5ca878;
    }
    h2 {
      margin: 10px 0 7px;
      color: #1d2d25;
      font-size: 30px;
      letter-spacing: -1.1px;
    }
    .form-heading p {
      margin: 0;
      color: #7c8981;
      font-size: 12px;
    }
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      margin-bottom: 24px;
      padding: 4px;
      border-radius: 8px;
      background: #f2f5f3;
    }
    .tabs button {
      min-height: 34px;
      border: 0;
      border-radius: 6px;
      color: #819087;
      background: transparent;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
    }
    .tabs button.selected {
      color: #24372b;
      background: white;
      box-shadow: 0 1px 4px #1b33221a;
      font-weight: 650;
    }
    form {
      display: grid;
      gap: 9px;
    }
    label {
      color: #36483d;
      font-size: 10px;
      font-weight: 650;
    }
    input,
    select {
      width: 100%;
      height: 43px;
      box-sizing: border-box;
      margin-bottom: 8px;
      padding: 0 12px;
      border: 1px solid #e0e7e2;
      border-radius: 7px;
      outline: none;
      color: #26372d;
      background: white;
      font: inherit;
      font-size: 11px;
    }
    input::placeholder {
      color: #abb5ae;
    }
    input:focus,
    select:focus {
      border-color: #6ebd87;
      box-shadow: 0 0 0 3px #6ebd871e;
    }
    .password-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .text-link {
      padding: 0;
      border: 0;
      color: #4f9969;
      background: transparent;
      font: inherit;
      font-size: 10px;
      cursor: pointer;
    }
    .submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 11px;
      height: 44px;
      margin-top: 5px;
      border: 0;
      border-radius: 7px;
      color: white;
      background: #1c5034;
      font: inherit;
      font-size: 11px;
      font-weight: 650;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .submit:hover {
      background: #246542;
    }
    .submit:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .submit span {
      font-size: 17px;
      font-weight: 400;
    }
    .error {
      padding: 10px 12px;
      border-radius: 6px;
      color: #a63333;
      background: #fff0f0;
      font-size: 11px;
      line-height: 1.5;
    }
    .security-note {
      display: flex;
      justify-content: center;
      gap: 7px;
      margin-top: 20px;
      color: #829087;
      font-size: 9px;
    }
    .lock {
      color: #5ba575;
    }
    .demo-note {
      display: grid;
      gap: 3px;
      margin-top: 22px;
      padding: 10px 12px;
      border: 1px solid #e4efe7;
      border-radius: 7px;
      background: #f7fbf8;
    }
    .demo-note strong {
      color: #477858;
      font-size: 10px;
    }
    .demo-note span {
      color: #819087;
      font-size: 9px;
    }
    .form-footer {
      position: absolute;
      right: 0;
      bottom: 27px;
      left: 0;
      color: #8a968f;
      text-align: center;
      font-size: 10px;
    }
    .form-footer a {
      color: #4c9565;
      text-decoration: none;
    }
    .mobile-brand {
      display: none;
    }
    @media (max-width: 1100px) {
      .intro {
        padding-inline: 36px;
      }
      .form-side {
        padding-inline: 40px;
      }
    }
    @media (max-width: 850px) {
      .login-layout {
        grid-template-columns: 1fr;
      }
      .intro {
        display: none;
      }
      .form-side {
        min-height: 100vh;
        padding: 36px 24px 78px;
      }
      .mobile-brand {
        display: block;
        margin-bottom: 35px;
        color: #265a3b;
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 1px;
      }
    }
  `;
}
