/* ================================================
   ChatCat — Admin Panel (admin.js)
   ================================================ */

'use strict';

const Admin = {
  currentUser: null, activeTab: 'stats', searchQuery: '',

  init() {
    this.currentUser = CC.requireAdmin();
    if (!this.currentUser) return;
    this.setupTabs();
    this.renderStats();
    this.renderUsers();
    this.renderMessages();
    this.setupSearch();
  },

  setupTabs() {
    CC.$$('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        CC.$$('.admin-tab').forEach(t => t.classList.remove('active'));
        CC.$$('.admin-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = CC.$('#' + tab.dataset.tab + '-panel');
        if (panel) panel.classList.add('active');
        this.activeTab = tab.dataset.tab;
      });
    });
  },

  renderStats() {
    const users = Auth.getAllUsers();
    const messages = CC.Storage.get(CC.KEYS.MESSAGES, []);
    const set = (id, v) => { const e = CC.$('#'+id); if (e) e.textContent = v; };
    set('stat-total-users', users.length);
    set('stat-online-users', CC.getOnlineCount());
    set('stat-total-messages', messages.length);
    set('stat-banned-users', users.filter(u=>u.isBanned).length);
    set('stat-muted-users', users.filter(u=>u.isMuted).length);
    set('stat-deleted-msgs', messages.filter(m=>m.isDeleted).length);
  },

  renderUsers() {
    const container = CC.$('#users-panel');
    if (!container) return;
    let users = Auth.getAllUsers();
    const q = this.searchQuery.toLowerCase();
    if (q) users = users.filter(u => u.username.toLowerCase().includes(q));

    let listEl = CC.$('#users-list');
    if (!listEl) { listEl = CC.el('div', { id:'users-list' }); container.appendChild(listEl); }
    listEl.innerHTML = '';

    if (users.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>لا يوجد مستخدمون</h3></div>';
      return;
    }

    users.forEach(user => {
      const item = CC.el('div', { className:'user-manage-item' });
      const avWrap = CC.el('div', { className:'avatar-wrapper' });
      avWrap.appendChild(CC.el('div', { className:`avatar avatar-sm${CC.isOnline(user.id)?' online':''}`, textContent:user.avatar }));

      const info = CC.el('div', { style:'flex:1;min-width:0;' });
      const nameRow = CC.el('div', { style:'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' });
      nameRow.innerHTML = `<strong style="font-size:0.9rem;">${user.username}</strong>`;
      if (user.isAdmin) nameRow.innerHTML += '<span class="badge badge-warning" style="font-size:0.65rem;">مدير</span>';
      if (user.isBanned) nameRow.innerHTML += '<span class="badge badge-danger" style="font-size:0.65rem;">محظور</span>';
      if (user.isMuted) nameRow.innerHTML += '<span class="badge badge-warning" style="font-size:0.65rem;">مكتوم</span>';
      info.appendChild(nameRow);
      info.appendChild(CC.el('p', { style:'font-size:0.75rem;color:var(--text-muted);', textContent:`العمر ${user.age} • انضم ${CC.formatDate(user.joinDate)}` }));

      const actions = CC.el('div', { className:'user-manage-actions' });
      if (!user.isAdmin) {
        const muteBtn = CC.el('button', { className:`btn btn-sm ${user.isMuted?'btn-secondary':'btn-ghost'}`, textContent: user.isMuted?'🔊 إلغاء الكتم':'🔇 كتم' });
        muteBtn.addEventListener('click', () => { Auth.updateUser(user.id, { isMuted:!user.isMuted }); CC.showToast(user.isMuted?'تم إلغاء الكتم':'تم كتم المستخدم','info'); this.renderUsers(); this.renderStats(); });
        const banBtn = CC.el('button', { className:`btn btn-sm ${user.isBanned?'btn-secondary':'btn-danger'}`, textContent: user.isBanned?'✓ رفع الحظر':'🚫 حظر' });
        banBtn.addEventListener('click', () => { Auth.updateUser(user.id, { isBanned:!user.isBanned }); CC.showToast(user.isBanned?'تم رفع الحظر':'تم حظر المستخدم', user.isBanned?'success':'warning'); this.renderUsers(); this.renderStats(); });
        const delBtn = CC.el('button', { className:'btn btn-sm btn-danger', textContent:'🗑 حذف' });
        delBtn.addEventListener('click', () => { if(confirm(`حذف المستخدم "${user.username}"؟ لا يمكن التراجع.`)){ Auth.deleteUser(user.id); CC.showToast('تم حذف المستخدم','success'); this.renderUsers(); this.renderMessages(); this.renderStats(); } });
        actions.appendChild(muteBtn); actions.appendChild(banBtn); actions.appendChild(delBtn);
      }

      item.appendChild(avWrap); item.appendChild(info); item.appendChild(actions);
      listEl.appendChild(item);
    });
  },

  renderMessages() {
    const container = CC.$('#messages-panel');
    if (!container) return;
    let messages = CC.Storage.get(CC.KEYS.MESSAGES, []);
    const q = this.searchQuery.toLowerCase();
    if (q) messages = messages.filter(m => m.text.toLowerCase().includes(q) || (Auth.getUser(m.userId)?.username||'').toLowerCase().includes(q));

    let listEl = CC.$('#messages-list');
    if (!listEl) { listEl = CC.el('div', { id:'messages-list' }); container.appendChild(listEl); }
    listEl.innerHTML = '';

    if (messages.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><h3>لا توجد رسائل</h3></div>';
      return;
    }

    [...messages].reverse().slice(0, 50).forEach(msg => {
      const user = Auth.getUser(msg.userId);
      const item = CC.el('div', { className:'user-manage-item' });
      const avWrap = CC.el('div', { className:'avatar-wrapper' });
      avWrap.appendChild(CC.el('div', { className:'avatar avatar-sm', textContent: user?.avatar || '👤' }));

      const info = CC.el('div', { style:'flex:1;min-width:0;overflow:hidden;' });
      info.appendChild(CC.el('div', { style:'display:flex;align-items:center;gap:6px;', innerHTML:`<strong style="font-size:0.85rem;">${user?.username||'محذوف'}</strong> <span style="font-size:0.7rem;color:var(--text-muted);">${CC.formatTime(msg.timestamp)}</span>` }));
      info.appendChild(CC.el('p', { style:'font-size:0.8rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', textContent: msg.isDeleted?'(محذوفة)':msg.text }));

      const actions = CC.el('div', { className:'user-manage-actions' });
      if (!msg.isDeleted) {
        const delBtn = CC.el('button', { className:'btn btn-sm btn-danger', textContent:'🗑 حذف' });
        delBtn.addEventListener('click', () => {
          const msgs = CC.Storage.get(CC.KEYS.MESSAGES, []);
          const idx = msgs.findIndex(m => m.id === msg.id);
          if (idx !== -1) { msgs[idx].isDeleted = true; msgs[idx].text = ''; CC.Storage.set(CC.KEYS.MESSAGES, msgs); CC.showToast('تم حذف الرسالة','success'); this.renderMessages(); this.renderStats(); }
        });
        actions.appendChild(delBtn);
      }

      item.appendChild(avWrap); item.appendChild(info); item.appendChild(actions);
      listEl.appendChild(item);
    });
  },

  setupSearch() {
    const input = CC.$('#admin-search');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { this.searchQuery = input.value.trim(); this.renderUsers(); this.renderMessages(); }, 300);
    });
  },
};

if (document.getElementById('admin-page')) {
  document.addEventListener('DOMContentLoaded', () => Admin.init());
}
window.Admin = Admin;
