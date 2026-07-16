/* ================================================
   ChatCat — Profile (profile.js)
   ================================================ */

'use strict';

const Profile = {
  currentUser: null, viewingUser: null, isOwnProfile: false,

  init() {
    this.currentUser = CC.requireAuth();
    if (!this.currentUser) return;

    const viewId = CC.Storage.get('cc_view_profile');
    if (viewId && viewId !== this.currentUser.id) {
      this.viewingUser = Auth.getUser(viewId);
      this.isOwnProfile = false;
    } else {
      this.viewingUser = this.currentUser;
      this.isOwnProfile = true;
    }
    CC.Storage.remove('cc_view_profile');

    this.renderProfile();
    this.setupEditModal();
  },

  renderProfile() {
    const user = this.viewingUser;
    if (!user) return;
    const online = CC.isOnline(user.id);

    CC.$('#profile-avatar').textContent = user.avatar;
    CC.$('#profile-username').textContent = user.username;
    CC.$('#profile-bio').textContent = user.bio || (this.isOwnProfile ? 'أضف نبذة…' : 'لا توجد نبذة.');
    CC.$('#profile-followers').textContent = (user.followers||[]).length;
    CC.$('#profile-following').textContent = (user.following||[]).length;
    const msgs = CC.Storage.get(CC.KEYS.MESSAGES, []).filter(m => m.userId === user.id && !m.isDeleted);
    CC.$('#profile-messages').textContent = msgs.length;

    const onlineEl = CC.$('#profile-online-status');
    if (onlineEl) {
      onlineEl.className = `badge badge-${online?'success':'muted'}`;
      onlineEl.textContent = online ? '🟢 متصل' : `⚫ آخر ظهور ${CC.timeAgo(user.lastSeen||user.joinDate)}`;
    }

    CC.$('#info-age').textContent = `${user.age} سنة`;
    CC.$('#info-country').textContent = user.country || 'غير محدد';
    CC.$('#info-joined').textContent = CC.formatDate(user.joinDate);

    const editBtn = CC.$('#edit-profile-btn');
    const followBtn = CC.$('#follow-profile-btn');
    const logoutBtn = CC.$('#profile-logout-btn');
    const backBtn = CC.$('#back-btn');
    const settingsSection = CC.$('#settings-section');

    if (editBtn) editBtn.style.display = this.isOwnProfile ? 'inline-flex' : 'none';
    if (logoutBtn) logoutBtn.style.display = this.isOwnProfile ? 'inline-flex' : 'none';
    if (backBtn) backBtn.style.display = this.isOwnProfile ? 'none' : 'inline-flex';
    if (settingsSection) settingsSection.style.display = this.isOwnProfile ? 'block' : 'none';

    if (followBtn) {
      if (this.isOwnProfile) { followBtn.style.display = 'none'; }
      else {
        followBtn.style.display = 'inline-flex';
        const isFollowing = Auth.isFollowing(user.id);
        followBtn.className = `btn ${isFollowing?'btn-ghost':'btn-primary'}`;
        followBtn.textContent = isFollowing ? 'يتابع' : 'متابعة';
        followBtn.onclick = () => {
          if (isFollowing) Auth.unfollow(user.id); else Auth.follow(user.id);
          this.currentUser = Auth.getCurrentUser();
          this.renderProfile();
        };
      }
    }

    if (user.isAdmin) {
      const nameLine = CC.$('#profile-username');
      if (nameLine && !CC.$('#admin-badge')) {
        const badge = CC.el('span', { id:'admin-badge', className:'badge badge-warning', style:'margin-left:8px;font-size:0.7rem;', textContent:'⭐ مدير' });
        nameLine.parentElement.appendChild(badge);
      }
    }

    if (backBtn) backBtn.onclick = () => history.back();
    this.setupSettings();
  },

  setupSettings() {
    if (!this.isOwnProfile) return;
    const settings = CC.getSettings();

    const darkToggle = CC.$('#dark-mode-toggle');
    if (darkToggle) {
      darkToggle.className = `toggle-switch${settings.darkMode?' on':''}`;
      darkToggle.onclick = () => {
        settings.darkMode = !settings.darkMode;
        darkToggle.className = `toggle-switch${settings.darkMode?' on':''}`;
        CC.saveSettings(settings);
      };
    }

    const rtlToggle = CC.$('#rtl-toggle');
    if (rtlToggle) {
      rtlToggle.className = `toggle-switch${settings.rtl?' on':''}`;
      rtlToggle.onclick = () => {
        settings.rtl = !settings.rtl;
        settings.language = settings.rtl ? 'ar' : 'en';
        rtlToggle.className = `toggle-switch${settings.rtl?' on':''}`;
        CC.saveSettings(settings);
      };
    }
  },

  setupEditModal() {
    if (!this.isOwnProfile) return;
    const editBtn = CC.$('#edit-profile-btn');
    const modal = CC.$('#edit-modal');
    const closeBtn = CC.$('#close-edit-modal');
    const saveBtn = CC.$('#save-profile-btn');
    if (!editBtn || !modal) return;

    editBtn.addEventListener('click', () => {
      const user = Auth.getCurrentUser();
      CC.$('#edit-bio').value = user.bio || '';
      CC.$('#edit-country').value = user.country || '';
      const ud = CC.$('#edit-username-display');
      if (ud) ud.textContent = user.username;
      const grid = CC.$('#edit-avatar-grid');
      if (grid) {
        grid.innerHTML = '';
        CC.MOCK_AVATARS.forEach(emoji => {
          const opt = CC.el('div', { className:`avatar-option${user.avatar===emoji?' selected':''}`, textContent:emoji });
          opt.addEventListener('click', () => {
            CC.$$('#edit-avatar-grid .avatar-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
          });
          grid.appendChild(opt);
        });
      }
      modal.style.display = 'flex';
    });

    closeBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    saveBtn?.addEventListener('click', () => {
      const bio = CC.$('#edit-bio').value.trim().slice(0, 160);
      const country = CC.$('#edit-country').value.trim().slice(0, 50);
      const selAvatar = CC.$('#edit-avatar-grid .avatar-option.selected')?.textContent;
      const updates = { bio, country };
      if (selAvatar) updates.avatar = selAvatar;
      Auth.updateUser(this.currentUser.id, updates);
      this.currentUser = Auth.getCurrentUser();
      this.viewingUser = this.currentUser;
      modal.style.display = 'none';
      this.renderProfile();
      CC.showToast('تم تحديث الملف! ✨', 'success');
    });
  },
};

if (document.getElementById('profile-page')) {
  document.addEventListener('DOMContentLoaded', () => Profile.init());
}
window.Profile = Profile;
