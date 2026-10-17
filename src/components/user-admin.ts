import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { listUsers, updateUserRole } from '../api';
import type { ManagedUser, UserRole } from '../model';
import { refreshCurrentUserRole } from '../auth';
import { store } from '../store';

@customElement('user-admin')
export class UserAdmin extends LitElement {
  @state() private users: ManagedUser[] = [];
  @state() private loading = true;
  @state() private busyUid = '';
  @state() private errorMessage = '';
  @state() private successMessage = '';

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private async load() {
    this.loading = true;
    try {
      this.users = await listUsers();
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося завантажити користувачів.';
      console.error('Не вдалося завантажити користувачів', error);
    } finally {
      this.loading = false;
    }
  }

  private async changeRole(user: ManagedUser, role: UserRole) {
    if (
      user.uid === store.user?.uid &&
      role !== store.user.role &&
      !window.confirm(
        'Зміна власної ролі може закрити вам доступ до адміністрування. Продовжити?',
      )
    ) {
      await this.load();
      return;
    }
    this.busyUid = user.uid;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await updateUserRole(user.uid, role);
      await this.load();
      if (user.uid === store.user?.uid) await refreshCurrentUserRole();
      this.successMessage = 'Роль користувача оновлено.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'Не вдалося змінити роль.';
      console.error(`Не вдалося змінити роль користувача ${user.uid}`, error);
    } finally {
      this.busyUid = '';
    }
  }

  render() {
    return html`
      <div class="page-head">
        <div>
          <div class="eyebrow">АДМІНІСТРУВАННЯ</div>
          <h1>Користувачі</h1>
          <p>Керуйте обліковими записами та ролями доступу.</p>
        </div>
        <button class="refresh" @click=${this.load}>Оновити список</button>
      </div>
      <section class="note">
        <span>ⓘ</span>
        <p>
          Нові користувачі створюють акаунт самостійно та отримують роль «Оператор».
          Адміністратор може змінити роль тут.
        </p>
      </section>
      ${this.errorMessage ? html`<div class="notice error" role="alert">${this.errorMessage}</div>` : ''}
      ${this.successMessage ? html`<div class="notice" role="status">${this.successMessage}</div>` : ''}
      <section class="panel">
        ${
          this.loading
            ? html`<div class="empty">Завантаження користувачів…</div>`
            : this.users.length === 0
              ? html`<div class="empty">Користувачів ще немає.</div>`
              : html`<div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>КОРИСТУВАЧ</th>
                        <th>ІДЕНТИФІКАТОР</th>
                        <th>ДАТА ДОДАВАННЯ</th>
                        <th>РОЛЬ</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.users.map(
                        (user) =>
                          html`<tr>
                            <td>
                              <div class="user-cell">
                                <span>${user.email.slice(0, 1).toUpperCase()}</span
                                ><strong>${user.email}</strong>
                              </div>
                            </td>
                            <td class="uid">${user.uid}</td>
                            <td>
                              ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('uk-UA') : '—'}
                            </td>
                            <td>
                              <span class="role ${user.role}"
                                >${user.role === 'admin' ? 'Адміністратор' : 'Оператор'}</span
                              >
                            </td>
                            <td>
                              <select
                                aria-label="Роль для ${user.email}"
                                .value=${user.role}
                                ?disabled=${this.busyUid === user.uid}
                                @change=${(event: Event) => void this.changeRole(user, (event.target as HTMLSelectElement).value as UserRole)}
                              >
                                <option value="operator">Оператор</option>
                                <option value="admin">Адміністратор</option>
                              </select>
                            </td>
                          </tr>`,
                      )}
                    </tbody>
                  </table>
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
    .refresh {
      height: 33px;
      padding: 0 11px;
      border: 1px solid #e0e8e2;
      border-radius: 5px;
      color: #65766a;
      background: white;
      font: inherit;
      font-size: 8px;
      cursor: pointer;
    }
    .note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
      padding: 12px;
      border: 1px solid #dfece2;
      border-radius: 7px;
      color: #518361;
      background: #f5faf6;
    }
    .note > span {
      font-size: 14px;
    }
    .note p {
      margin: 0;
      color: #64786b;
      font-size: 9px;
      line-height: 1.5;
    }
    .panel {
      overflow: hidden;
      border: 1px solid #e7ede8;
      border-radius: 8px;
      background: white;
    }
    .table-wrap {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th,
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #edf1ee;
      color: #758279;
      font-size: 9px;
      white-space: nowrap;
    }
    th {
      color: #94a097;
      background: #f7f9f7;
      font-size: 8px;
      letter-spacing: 0.4px;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #405247;
    }
    .user-cell > span {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      color: #418254;
      background: #edf7ef;
      font-weight: 700;
    }
    .user-cell strong {
      font-size: 9px;
      font-weight: 600;
    }
    .uid {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role {
      padding: 4px 7px;
      border-radius: 5px;
      color: #6d7e72;
      background: #f1f4f1;
      font-size: 8px;
    }
    .role.admin {
      color: #4d885c;
      background: #edf7ef;
    }
    select {
      min-width: 110px;
      height: 29px;
      padding: 0 7px;
      border: 1px solid #e3eae5;
      border-radius: 5px;
      color: #5d6f63;
      background: white;
      font: inherit;
      font-size: 8px;
    }
    select:disabled {
      opacity: 0.6;
    }
    .notice {
      margin: 10px 0;
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
    .empty {
      padding: 45px;
      color: #829087;
      font-size: 10px;
      text-align: center;
    }
  `;
}
