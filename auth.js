/* ================================================
   ChatCat — Authentication (auth.js)
   ================================================ */

'use strict';

const Auth = {
  getCurrentUser() {
    const id = CC.Storage.get(CC.KEYS.CURRENT_USER);
    if (!id) return null;
    return this.getAllUsers().find(u => u.id === id) || null;
  },

  getUser(id) { return this.getAllUsers().find(u => u.id === id) || null; },
  getAllUsers() { return CC.Storage.get(CC.KEYS.USERS, []); },

  updateUser(id, data) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...data };
    CC.Storage.set(CC.KEYS.USERS, users);
    return true;
  },

  deleteUser(id) {
    let users = this.getAllUsers().filter(u => u.id !== id);
    CC.Storage.set(CC.KEYS.USERS, users);
    let msgs = CC.Storage.get(CC.KEYS.MESSAGES, []).filter(m => m.userId !== id);
    CC.Storage.set(CC.KEYS.MESSAGES, msgs);
    return true;
  },

  validatePassword(p) { return p.length < 6 ? 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' : null; },
  validateUsername(u) {
    if (!u || u.trim().length < 3) return 'اسم المستخدم يجب أن يكون ٣ أحرف على الأقل';
    if (u.length > 20) return 'اسم المستخدم يجب أن يكون ٢٠ حرفاً كحد أقصى';
    if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط';
    return null;
  },

  register(username, age, password, avatar) {
    const uErr = this.validateUsername(username);
    if (uErr) return { success:false, error:uErr };
    const pErr = this.validatePassword(password);
    if (pErr) return { success:false, error:pErr };
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) return { success:false, error:'العمر يجب أن يكون بين ١٣ و١٢٠' };
    if (!avatar) return { success:false, error:'يرجى اختيار صورة رمزية' };

    const users = this.getAllUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
      return { success:false, error:'اسم المستخدم محجوز بالفعل' };

    const newUser = {
      id: CC.generateId(), username: username.trim(), age: ageNum, password, avatar,
      bio: '', country: '', isAdmin: false, isMuted: false, isBanned: false,
      followers: [], following: [], joinDate: Date.now(), lastSeen: Date.now(),
    };
    users.push(newUser);
    CC.Storage.set(CC.KEYS.USERS, users);
    CC.Storage.set(CC.KEYS.CURRENT_USER, newUser.id);
    CC.markOnline(newUser.id);
    return { success:true, user:newUser };
  },

  login(username, password) {
    const user = this.getAllUsers().find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!user) return { success:false, error:'اسم المستخدم أو كلمة المرور غير صحيحة' };
    if (user.isBanned) return { success:false, error:'تم حظر حسابك' };
    CC.Storage.set(CC.KEYS.CURRENT_USER, user.id);
    CC.markOnline(user.id);
    this.updateUser(user.id, { lastSeen: Date.now() });
    return { success:true, user };
  },

  logout() {
    const id = CC.Storage.get(CC.KEYS.CURRENT_USER);
    if (id) { CC.markOffline(id); this.updateUser(id, { lastSeen: Date.now() }); }
    CC.Storage.remove(CC.KEYS.CURRENT_USER);
    CC.navigate('login.html');
  },

  follow(targetId) {
    const me = this.getCurrentUser();
    if (!me || me.id === targetId) return;
    const target = this.getUser(targetId);
    if (!target) return;
    const myFollowing = me.following || [];
    if (!myFollowing.includes(targetId)) { myFollowing.push(targetId); this.updateUser(me.id, { following: myFollowing }); }
    const theirFollowers = target.followers || [];
    if (!theirFollowers.includes(me.id)) { theirFollowers.push(me.id); this.updateUser(targetId, { followers: theirFollowers }); }
  },

  unfollow(targetId) {
    const me = this.getCurrentUser();
    if (!me) return;
    this.updateUser(me.id, { following: (me.following||[]).filter(id=>id!==targetId) });
    const t = this.getUser(targetId);
    if (t) this.updateUser(targetId, { followers: (t.followers||[]).filter(id=>id!==me.id) });
  },

  isFollowing(targetId) {
    const me = this.getCurrentUser();
    return me ? (me.following||[]).includes(targetId) : false;
  },

  addFriend(targetId) {
    this.follow(targetId);
    const target = this.getUser(targetId), me = this.getCurrentUser();
    if (target && me) {
      const tf = target.following || [];
      if (!tf.includes(me.id)) { tf.push(me.id); this.updateUser(targetId, { following: tf }); }
      const mf = me.followers || [];
      if (!mf.includes(targetId)) { mf.push(targetId); this.updateUser(me.id, { followers: mf }); }
    }
    const friends = CC.Storage.get(CC.KEYS.FRIENDS, {});
    if (!friends[me.id]) friends[me.id] = [];
    if (!friends[me.id].includes(targetId)) friends[me.id].push(targetId);
    CC.Storage.set(CC.KEYS.FRIENDS, friends);
  },

  skipUser(targetId) {
    const me = this.getCurrentUser();
    if (!me) return;
    const skipped = CC.Storage.get(CC.KEYS.SKIPPED, {});
    if (!skipped[me.id]) skipped[me.id] = [];
    if (!skipped[me.id].includes(targetId)) skipped[me.id].push(targetId);
    CC.Storage.set(CC.KEYS.SKIPPED, skipped);
  },

  getFriendSuggestions() {
    const me = this.getCurrentUser();
    if (!me) return [];
    const skipped = (CC.Storage.get(CC.KEYS.SKIPPED, {})[me.id]) || [];
    const friends = (CC.Storage.get(CC.KEYS.FRIENDS, {})[me.id]) || [];
    const excluded = new Set([me.id, ...skipped, ...friends]);
    return this.getAllUsers().filter(u => !excluded.has(u.id) && !u.isAdmin);
  },
};

function initLoginPage() {
  const form = CC.$('#login-form');
  if (!form) return;
  const userInput = CC.$('#login-username');
  const passInput = CC.$('#login-password');
  const errBox = CC.$('#login-error');
  const submitBtn = CC.$('#login-submit');

  CC.$('#toggle-password')?.addEventListener('click', () => {
    const t = passInput.type === 'password' ? 'text' : 'password';
    passInput.type = t;
    CC.$('#toggle-password').textContent = t === 'password' ? '👁' : '🙈';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errBox.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ تسجيل الدخول…';
    const result = Auth.login(userInput.value.trim(), passInput.value);
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تسجيل الدخول';
      if (result.success) CC.navigate('home.html');
      else { errBox.textContent = result.error; errBox.classList.add('visible'); }
    }, 400);
  });
}

function initRegisterPage() {
  const form = CC.$('#register-form');
  if (!form) return;
  const errBox = CC.$('#register-error');
  const submitBtn = CC.$('#register-submit');
  let selectedAvatar = '';

  const avatarGrid = CC.$('#avatar-grid');
  if (avatarGrid) {
    CC.MOCK_AVATARS.forEach(emoji => {
      const opt = CC.el('div', { className:'avatar-option', textContent:emoji });
      opt.addEventListener('click', () => {
        CC.$$('.avatar-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedAvatar = emoji;
        const disp = CC.$('#selected-avatar-display');
        if (disp) disp.textContent = emoji;
      });
      avatarGrid.appendChild(opt);
    });
    avatarGrid.firstChild?.click();
  }

  CC.$('#toggle-password')?.addEventListener('click', () => {
    const p = CC.$('#reg-password');
    const t = p.type === 'password' ? 'text' : 'password';
    p.type = t;
    CC.$('#toggle-password').textContent = t === 'password' ? '👁' : '🙈';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errBox.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ إنشاء الحساب…';
    const result = Auth.register(
      CC.$('#reg-username').value.trim(),
      CC.$('#reg-age').value,
      CC.$('#reg-password').value,
      selectedAvatar
    );
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'إنشاء حساب';
      if (result.success) {
        CC.showToast('تم إنشاء الحساب! أهلاً بك في شات كات 🐱', 'success');
        setTimeout(() => CC.navigate('home.html'), 500);
      } else { errBox.textContent = result.error; errBox.classList.add('visible'); }
    }, 400);
  });
}

function setupLogout() {
  CC.$$('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => { if (confirm('هل أنت متأكد من تسجيل الخروج؟')) Auth.logout(); });
  });
}

window.Auth = Auth;
