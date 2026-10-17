import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import { signOutUser } from '../auth';
import type { AppUser } from '../model';
import { store } from '../store';

@customElement('app-shell')
export class AppShell extends LitElement {
  @state() private user: AppUser | null = store.user;
  @state() private currentPath = window.location.pathname;

  private readonly syncState = () => {
    this.user = store.user;
    this.currentPath = window.location.pathname;
  };

  connectedCallback() {
    super.connectedCallback();
    store.addEventListener('change', this.syncState);
    window.addEventListener('vaadin-router-location-changed', this.syncState);
    window.addEventListener('popstate', this.syncState);
  }

  disconnectedCallback() {
    store.removeEventListener('change', this.syncState);
    window.removeEventListener('vaadin-router-location-changed', this.syncState);
    window.removeEventListener('popstate', this.syncState);
    super.disconnectedCallback();
  }

  private async logout() {
    try {
      await signOutUser();
      Router.go('/login');
    } catch (error) {
      console.error('Не вдалося завершити сеанс', error);
    }
  }

  private isActive(path: string) {
    return this.currentPath === path;
  }

  render() {
    return html`
      <div class="layout">
        <aside class="sidebar">
          <a class="brand" href="/dashboard" aria-label="SmartMonitor — головна">
            <span class="brand-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 13h4l3-8 4 14 3-8h4" />
              </svg>
            </span>
            <span>smart<span>monitor</span></span>
          </a>
          <div class="workspace-label">РОБОЧИЙ ПРОСТІР</div>
          <nav aria-label="Головна навігація">
            <a class=${this.isActive('/dashboard') ? 'active' : ''} href="/dashboard">
              <span class="nav-icon">⌂</span>Дашборд
            </a>
            <a class=${this.isActive('/alerts') ? 'active' : ''} href="/alerts">
              <span class="nav-icon">◇</span>Сповіщення
            </a>
            <a class=${this.isActive('/profile') ? 'active' : ''} href="/profile">
              <span class="nav-icon">♙</span>Мій профіль
            </a>
            <a class=${this.isActive('/devices') ? 'active' : ''} href="/devices">
              <span class="nav-icon">▦</span>Пристрої
            </a>
            ${
              this.user?.role === 'admin'
                ? html`
                    <a class=${this.isActive('/zones') ? 'active' : ''} href="/zones">
                      <span class="nav-icon">⌖</span>Зони
                    </a>
                    <a class=${this.isActive('/users') ? 'active' : ''} href="/users">
                      <span class="nav-icon">♙</span>Користувачі
                    </a>
                  `
                : ''
            }
          </nav>
          <div class="sidebar-bottom">
            <div class="connection">
              <span class="pulse"></span>
              <span
                ><strong
                  >${store.mqttConnected ? 'MQTT підключено' : 'Очікування з’єднання'}</strong
                ><small
                  >${store.mqttConnected ? 'Потік телеметрії активний' : 'Демо або брокер недоступний'}</small
                ></span
              >
            </div>
            <div class="profile">
              <div class="avatar">${this.user?.email?.slice(0, 1).toUpperCase()}</div>
              <div class="profile-info">
                <strong>${this.user?.email}</strong>
                <small
                  >${this.user?.role === 'admin' ? 'Адміністратор' : 'Оператор'}</small
                >
              </div>
              <button class="logout" type="button" title="Вийти" @click=${this.logout}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10 17l5-5-5-5M15 12H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </aside>
        <div class="main-column">
          <header class="topbar">
            <div class="breadcrumbs">SmartMonitor <span>/</span> ${this.pageName}</div>
            <div class="topbar-right">
              <span class="today">${this.currentDate}</span>
              <span class="top-avatar"
                >${this.user?.email?.slice(0, 1).toUpperCase()}</span
              >
            </div>
          </header>
          <main class="content">${this.renderCurrentPage()}</main>
        </div>
      </div>
    `;
  }

  private get pageName() {
    if (this.currentPath === '/devices') return 'Пристрої';
    if (this.currentPath === '/zones') return 'Зони';
    if (this.currentPath === '/alerts') return 'Сповіщення';
    if (this.currentPath === '/users') return 'Користувачі';
    if (this.currentPath === '/profile') return 'Мій профіль';
    if (this.currentPath.includes('/history')) return 'Історія показань';
    if (this.currentPath.startsWith('/devices/')) return 'Пристрій';
    return 'Дашборд';
  }

  private get currentDate() {
    return new Intl.DateTimeFormat('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }

  private renderCurrentPage() {
    if (
      this.user?.role !== 'admin' &&
      (this.currentPath === '/zones' || this.currentPath === '/users')
    ) {
      return html`<dashboard-page></dashboard-page>`;
    }
    if (this.currentPath === '/devices') return html`<device-list></device-list>`;
    if (this.currentPath === '/zones') return html`<zone-manager></zone-manager>`;
    if (this.currentPath === '/alerts') return html`<alert-list></alert-list>`;
    if (this.currentPath === '/users') return html`<user-admin></user-admin>`;
    if (this.currentPath === '/profile') return html`<profile-page></profile-page>`;
    if (this.currentPath.includes('/history')) {
      const deviceId = decodeURIComponent(this.currentPath.split('/')[2] ?? '');
      const device = store.devices.find((item) => item.id === deviceId);
      return html`<div class="history-page">
        <button
          class="history-back"
          @click=${() => Router.go(`/devices/${encodeURIComponent(deviceId)}`)}
        >
          ← До пристрою</button
        ><history-view
          .deviceId=${deviceId}
          .unit=${device?.unit ?? '°C'}
          .label=${device?.name ?? deviceId}
        ></history-view>
      </div>`;
    }
    if (this.currentPath.startsWith('/devices/')) {
      return html`<device-detail-page></device-detail-page>`;
    }
    return html`<dashboard-page></dashboard-page>`;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      color: #17231e;
    }
    .layout {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 252px minmax(0, 1fr);
    }
    .sidebar {
      background: #10251f;
      color: #fff;
      padding: 25px 16px 18px;
      display: flex;
      flex-direction: column;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      text-decoration: none;
      font-size: 19px;
      font-weight: 750;
      letter-spacing: -0.6px;
      padding: 0 10px;
    }
    .brand > span:last-child > span {
      color: #85d6a4;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: #6ac58a;
    }
    .brand-mark svg {
      width: 22px;
      fill: none;
      stroke: #10251f;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace-label {
      margin: 47px 10px 12px;
      color: #789087;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
    }
    nav {
      display: grid;
      gap: 5px;
    }
    nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 43px;
      padding: 0 12px;
      border-radius: 8px;
      color: #a9bbb3;
      text-decoration: none;
      font-size: 13px;
      font-weight: 550;
      transition: 0.15s ease;
    }
    nav a:hover {
      color: #fff;
      background: #1d3930;
    }
    nav a.active {
      color: #f7fff9;
      background: #244436;
      box-shadow: inset 3px 0 #72d393;
    }
    .nav-icon {
      width: 20px;
      font-size: 21px;
      text-align: center;
      line-height: 1;
    }
    .sidebar-bottom {
      margin-top: auto;
    }
    .connection {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 4px 17px;
      padding: 12px;
      background: #19352b;
      border: 1px solid #2b4a3d;
      border-radius: 9px;
    }
    .pulse {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 4px;
      background: #77d394;
      border-radius: 50%;
      box-shadow: 0 0 0 4px #315541;
    }
    .connection strong,
    .connection small,
    .profile-info strong,
    .profile-info small {
      display: block;
    }
    .connection strong {
      font-size: 11px;
      font-weight: 650;
    }
    .connection small {
      margin-top: 4px;
      color: #96afa2;
      font-size: 10px;
    }
    .profile {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 13px 5px 0;
      border-top: 1px solid #294138;
    }
    .avatar,
    .top-avatar {
      display: grid;
      place-items: center;
      flex: none;
      background: #d7eee0;
      color: #225437;
      border-radius: 50%;
      font-weight: 700;
    }
    .avatar {
      width: 31px;
      height: 31px;
      font-size: 12px;
    }
    .profile-info {
      min-width: 0;
      flex: 1;
    }
    .profile-info strong {
      overflow: hidden;
      color: #e9f2ec;
      font-size: 10px;
      text-overflow: ellipsis;
    }
    .profile-info small {
      margin-top: 4px;
      color: #91a89b;
      font-size: 10px;
    }
    .logout {
      display: grid;
      place-items: center;
      width: 29px;
      height: 29px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: #99afa4;
      cursor: pointer;
    }
    .logout:hover {
      background: #294138;
      color: #fff;
    }
    .logout svg {
      width: 17px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .main-column {
      min-width: 0;
      background: #f5f7f5;
    }
    .topbar {
      height: 67px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 38px;
      background: #fff;
      border-bottom: 1px solid #e9eeea;
    }
    .breadcrumbs {
      color: #85918a;
      font-size: 12px;
    }
    .breadcrumbs span {
      padding: 0 9px;
      color: #c1c9c3;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .today {
      color: #758179;
      font-size: 11px;
    }
    .top-avatar {
      width: 30px;
      height: 30px;
      font-size: 12px;
    }
    .content {
      max-width: 1430px;
      margin: 0 auto;
      padding: 34px 38px 54px;
    }
    .history-page {
      display: grid;
      gap: 12px;
    }
    .history-back {
      justify-self: start;
      padding: 0;
      border: 0;
      color: #568b65;
      background: transparent;
      font: inherit;
      font-size: 9px;
      cursor: pointer;
    }
    @media (max-width: 1100px) {
      .layout {
        grid-template-columns: 220px minmax(0, 1fr);
      }
      .content {
        padding-inline: 25px;
      }
      .topbar {
        padding-inline: 25px;
      }
    }
  `;
}
