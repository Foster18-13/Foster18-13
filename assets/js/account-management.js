// Account Management Functions
const AUTO_APPROVAL_ENABLED = true;
const BOOTSTRAP_ADMIN_EMAILS = new Set(['antwifosterfrimpong@gmail.com']);

function normalizeAccountEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isBootstrapAdminUser(user) {
  const email = normalizeAccountEmail(user?.email);
  if (!email) return false;
  if (BOOTSTRAP_ADMIN_EMAILS.has(email)) return true;
  if (typeof isForcedAdminEmail === 'function') {
    return !!isForcedAdminEmail(email);
  }
  return false;
}

function showAccountMessage(message, type = 'ok') {
  const errorDiv = document.getElementById('accountError');
  const successDiv = document.getElementById('accountSuccess');
  
  if (type === 'error') {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  } else if (type === 'ok') {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
  }
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (type === 'error') {
      errorDiv.style.display = 'none';
    } else {
      successDiv.style.display = 'none';
    }
  }, 5000);
}

function formatAuditDetails(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

function renderAuditLogTable() {
  const tbody = document.querySelector('#auditLogTable tbody');
  if (!tbody || typeof getAuditLogs !== 'function') return;

  const logs = getAuditLogs(150);
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="6">No audit entries yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map((entry) => {
    const time = new Date(entry.timestamp || entry.createdAt || Date.now()).toLocaleString();
    const detailsText = formatAuditDetails(entry.details);
    return `
      <tr>
        <td>${time}</td>
        <td>${entry.user || 'Unknown user'}</td>
        <td>${entry.action || ''}</td>
        <td>${entry.date || ''}</td>
        <td>${entry.shift || ''}</td>
        <td>${detailsText || '-'}</td>
      </tr>
    `;
  }).join('');
}

function getRoleLabel(role) {
  const normalized = typeof normalizeUserRole === 'function' ? normalizeUserRole(role) : String(role || 'clerk').toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'supervisor') return 'Supervisor';
  return 'Clerk';
}

function normalizeManagedRoleValue(role) {
  if (typeof normalizeUserRole === 'function') {
    return normalizeUserRole(role);
  }
  const normalized = String(role || 'clerk').toLowerCase().trim();
  return ['clerk', 'supervisor', 'admin'].includes(normalized) ? normalized : 'clerk';
}

function normalizeEntryPermissionValue(value) {
  return value !== false;
}

async function loadUsersFromDirectory() {
  try {
    const col = (globalThis.FIREBASE_CLOUD_DOC?.collection) || 'warehousePortal';
    const dirRef = firebase.firestore().collection(col).doc('userDirectory');
    const doc = await dirRef.get();
    if (!doc.exists) return [];
    return Object.values(doc.data() ?? {}).filter((u) => !!u?.uid);
  } catch (e) {
    console.debug('Could not read user directory:', e);
    return [];
  }
}

async function fetchAllUsersFromFirestore(fetchUsersByQuery) {
  return fetchUsersByQuery((pageSize) =>
    firebase
      .firestore()
      .collection('users')
      .orderBy(firebase.firestore.FieldPath.documentId())
      .limit(pageSize)
  );
}

async function fetchUsersByApprovalFallback(fetchUsersByQuery) {
  const [approvedUsers, pendingUsers] = await Promise.all([
    fetchUsersByQuery((pageSize) =>
      firebase.firestore().collection('users').where('approved', '==', true)
        .orderBy(firebase.firestore.FieldPath.documentId()).limit(pageSize)
    ),
    fetchUsersByQuery((pageSize) =>
      firebase.firestore().collection('users').where('approved', '==', false)
        .orderBy(firebase.firestore.FieldPath.documentId()).limit(pageSize)
    )
  ]);
  const usersById = new Map();
  [...approvedUsers, ...pendingUsers].forEach((entry) => usersById.set(entry.id, entry));
  return Array.from(usersById.values());
}

async function resolveUserListWithFallbacks(fetchUsersByQuery) {
  try {
    const users = await fetchAllUsersFromFirestore(fetchUsersByQuery);
    return { users, partial: false };
  } catch {
    // fall through
  }
  try {
    const users = await fetchUsersByApprovalFallback(fetchUsersByQuery);
    return { users, partial: true };
  } catch {
    // fall through
  }
  const users = await loadUsersFromDirectory();
  return { users, partial: users.length > 0 };
}

async function isCurrentUserAdminForRoleChanges() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return false;
  if (isBootstrapAdminUser(currentUser)) return true;

  let role = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'clerk';
  if (typeof resolveUserRole === 'function') {
    try {
      role = await Promise.resolve(resolveUserRole(currentUser));
    } catch {
      // keep fallback role from local auth state
    }
  }

  const isAdminByRole = typeof hasRoleAccess === 'function' ? hasRoleAccess(role, 'admin') : role === 'admin';
  return isAdminByRole || isBootstrapAdminUser(currentUser);
}

async function loadUsersForRoleManagement() {
  const select = document.getElementById('roleUserSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Loading users...</option>';

  try {
    const fetchUsersByQuery = async (buildQuery) => {
      const collected = [];
      let cursor = null;
      const pageSize = 300;

      while (true) {
        let query = buildQuery(pageSize);
        if (cursor) {
          query = query.startAfter(cursor);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        snapshot.docs.forEach((doc) => {
          collected.push({ id: doc.id, ...doc.data() });
        });

        if (snapshot.docs.length < pageSize) break;
        cursor = snapshot.docs[snapshot.docs.length - 1];
      }

      return collected;
    };

    let users = [];
    let partialAccessOnly = false;

    const result = await resolveUserListWithFallbacks(fetchUsersByQuery);
    users = result.users;
    partialAccessOnly = result.partial;

    // Always ensure the current admin is in the list
    const currentUser = firebase.auth().currentUser;
    if (currentUser && !users.some((u) => (u.id || u.uid) === currentUser.uid)) {
      const selfRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'admin';
      users.push({
        id: currentUser.uid,
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        role: selfRole,
        canMakeEntries: true
      });
    }

    users.sort((a, b) => String(a.email || a.username || '').localeCompare(String(b.email || b.username || '')));

    if (!users.length) {
      select.innerHTML = '<option value="">No users found</option>';
      return;
    }

    if (partialAccessOnly) {
      showAccountMessage('Some users may not appear due to Firestore permission rules. To see all users, deploy firestore.rules via Firebase CLI or paste them in the Firebase Console → Firestore → Rules.', 'error');
    }

    select.innerHTML = users
      .map((entry) => {
        const display = entry.email || entry.username || entry.id;
        const normalizedRole = normalizeManagedRoleValue(entry.role);
        const role = getRoleLabel(normalizedRole);
        const canMakeEntries = normalizeEntryPermissionValue(entry.canMakeEntries);
        return `<option value="${entry.id}" data-role="${normalizedRole}" data-can-make-entries="${canMakeEntries ? '1' : '0'}">${display} (${role})</option>`;
      })
      .join('');

    const roleSelect = document.getElementById('targetRoleSelect');
    const canMakeEntriesCheckbox = document.getElementById('canMakeEntriesCheckbox');
    if (roleSelect) {
      const selectedOption = select.options[select.selectedIndex];
      roleSelect.value = normalizeManagedRoleValue(selectedOption?.dataset?.role || 'clerk');
      if (canMakeEntriesCheckbox) {
        canMakeEntriesCheckbox.checked = (selectedOption?.dataset?.canMakeEntries || '1') !== '0';
      }
    }
  } catch (error) {
    console.error('Failed to load users for role management:', error);
    select.innerHTML = '<option value="">Failed to load users</option>';
    const message = error?.code === 'permission-denied'
      ? 'Failed to load users: Firestore permissions are blocking access to user records. Deploy firestore.rules to allow admin user listing.'
      : 'Failed to load users for role management.';
    showAccountMessage(message, 'error');
  }
}

async function saveSelectedUserRole() {
  const select = document.getElementById('roleUserSelect');
  const roleSelect = document.getElementById('targetRoleSelect');
  const canMakeEntriesCheckbox = document.getElementById('canMakeEntriesCheckbox');
  if (!select || !roleSelect || !canMakeEntriesCheckbox) return;

  const isAdmin = await isCurrentUserAdminForRoleChanges();
  if (!isAdmin) {
    showAccountMessage('Only admins can change roles and entry permissions.', 'error');
    return;
  }

  const userId = select.value;
  const targetRole = normalizeManagedRoleValue(roleSelect.value);
  const targetCanMakeEntries = !!canMakeEntriesCheckbox.checked;

  if (!userId) {
    showAccountMessage('Select a user first.', 'error');
    return;
  }

  try {
    await firebase.firestore().collection('users').doc(userId).set({
      role: targetRole,
      canMakeEntries: targetCanMakeEntries,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const selectedOption = select.options[select.selectedIndex];
    const targetLabel = selectedOption?.textContent || userId;

    if (selectedOption) {
      selectedOption.dataset.role = targetRole;
      selectedOption.dataset.canMakeEntries = targetCanMakeEntries ? '1' : '0';
      const withoutRole = targetLabel.replace(/\s+\([^)]*\)\s*$/, '');
      selectedOption.textContent = `${withoutRole} (${getRoleLabel(targetRole)})`;
    }

    // Keep directory in sync so admins see updated roles next load
    if (typeof writeUserToDirectory === 'function') {
      const displayEmail = selectedOption?.text?.split(' (')[0] || userId;
      writeUserToDirectory({ uid: userId, email: displayEmail, displayName: displayEmail }, targetRole, targetCanMakeEntries);
    }

    const currentUser = firebase.auth().currentUser;
    if (currentUser && currentUser.uid === userId && typeof saveUserAuthState === 'function') {
      saveUserAuthState(currentUser, targetRole, targetCanMakeEntries);
    }

    if (typeof addAuditLog === 'function') {
      addAuditLog('User role updated', {
        targetUserId: userId,
        target: targetLabel,
        role: targetRole,
        canMakeEntries: targetCanMakeEntries
      });
    }

    showAccountMessage('User role and entry permission updated successfully.', 'ok');
  } catch (error) {
    console.error('Failed to save user role:', error);
    showAccountMessage('Failed to update user role.', 'error');
  }
}

async function initRoleManagement() {
  const section = document.getElementById('roleManagementSection');
  if (!section) return;

  const currentUser = firebase.auth().currentUser;
  let fallbackRole = isBootstrapAdminUser(currentUser) ? 'admin' : 'clerk';
  if (typeof getCurrentUserRole === 'function') {
    fallbackRole = getCurrentUserRole();
  }

  let resolvedRoleValue = fallbackRole;
  if (typeof resolveUserRole === 'function' && currentUser) {
    try {
      resolvedRoleValue = resolveUserRole(currentUser);
    } catch {
      resolvedRoleValue = fallbackRole;
    }
  }

  const role = await Promise.resolve(
    resolvedRoleValue
  );

  if (currentUser && typeof saveUserAuthState === 'function') {
    saveUserAuthState(currentUser, role);
  }

  const isAdminByRole = typeof hasRoleAccess === 'function' ? hasRoleAccess(role, 'admin') : role === 'admin';
  const isAdmin = isAdminByRole || isBootstrapAdminUser(currentUser);
  if (!isAdmin) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const refreshButton = document.getElementById('refreshRoleUsersBtn');
  const saveButton = document.getElementById('saveRoleBtn');
  const select = document.getElementById('roleUserSelect');
  const roleSelect = document.getElementById('targetRoleSelect');
  const canMakeEntriesCheckbox = document.getElementById('canMakeEntriesCheckbox');

  if (refreshButton) {
    refreshButton.addEventListener('click', loadUsersForRoleManagement);
  }
  if (saveButton) {
    saveButton.addEventListener('click', saveSelectedUserRole);
  }
  if (select && roleSelect) {
    select.addEventListener('change', () => {
      const selectedOption = select.options[select.selectedIndex];
      roleSelect.value = normalizeManagedRoleValue(selectedOption?.dataset?.role || 'clerk');
      if (canMakeEntriesCheckbox) {
        canMakeEntriesCheckbox.checked = (selectedOption?.dataset?.canMakeEntries || '1') !== '0';
      }
    });
  }

  await loadUsersForRoleManagement();
}

async function loadPendingUsers() {
  const tbody = document.querySelector('#pendingUsersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4">Loading pending users...</td></tr>';

  try {
    const snapshot = await firebase.firestore().collection('users').where('approved', '==', false).get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="4">No pending user approvals.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((user) => {
      const createdDate = new Date(user.createdAt || Date.now()).toLocaleDateString();
      return `
        <tr>
          <td>${user.email || user.username || 'Unknown'}</td>
          <td>${user.username || '-'}</td>
          <td>${createdDate}</td>
          <td>
            <button class="button button-small button-success" onclick="approveUserById('${user.id}', this)">Approve</button>
            <button class="button button-small button-danger" onclick="rejectUserById('${user.id}', this)">Reject</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load pending users:', error);
    const message = error?.code === 'permission-denied'
      ? 'Cannot load pending users: Firestore permissions are blocking access.'
      : 'Error loading pending users.';
    tbody.innerHTML = `<tr><td colspan="4">${message}</td></tr>`;
    if (typeof showAccountMessage === 'function') {
      showAccountMessage(message, 'error');
    }
  }
}

async function approveUserById(userId, btnElement) {
  try {
    const btn = btnElement;
    btn.disabled = true;
    btn.textContent = 'Approving...';

    const success = await approveUser(userId);
    if (success) {
      if (typeof addAuditLog === 'function') {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        addAuditLog('User approved', {
          userId: userId,
          email: userDoc.data()?.email || 'Unknown'
        });
      }
      showAccountMessage('User approved successfully.', 'ok');
      await loadPendingUsers();
    } else {
      throw new Error('Failed to approve user');
    }
  } catch (error) {
    console.error('Failed to approve user:', error);
    showAccountMessage('Failed to approve user.', 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = 'Approve';
    }
  }
}

async function rejectUserById(userId, btnElement) {
  try {
    const btn = btnElement;
    btn.disabled = true;
    btn.textContent = 'Rejecting...';

    const success = await rejectUser(userId);
    if (success) {
      if (typeof addAuditLog === 'function') {
        addAuditLog('User rejected', {
          userId: userId
        });
      }
      showAccountMessage('User rejected successfully.', 'ok');
      await loadPendingUsers();
    } else {
      throw new Error('Failed to reject user');
    }
  } catch (error) {
    console.error('Failed to reject user:', error);
    showAccountMessage('Failed to reject user.', 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = 'Reject';
    }
  }
}

async function getUserRole(currentUser) {
  let fallbackRole = 'clerk';
  if (typeof getCurrentUserRole === 'function') {
    fallbackRole = getCurrentUserRole();
  }

  let resolvedRoleValue = fallbackRole;
  if (typeof resolveUserRole === 'function' && currentUser) {
    resolvedRoleValue = resolveUserRole(currentUser);
  }

  return await Promise.resolve(resolvedRoleValue);
}

function isUserAdmin(role, currentUser) {
  const isAdminByRole = typeof hasRoleAccess === 'function' ? hasRoleAccess(role, 'admin') : role === 'admin';
  return isAdminByRole || isBootstrapAdminUser(currentUser);
}

function showAutoApprovalMessage(section, refreshButton, tbody) {
  section.style.display = 'block';
  if (refreshButton) {
    refreshButton.style.display = 'none';
  }
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4">Auto-approval is enabled. New accounts can log in immediately.</td></tr>';
  }
}

function showInsufficientPermissions(section, role) {
  section.style.display = 'none';
  if (typeof showAccountMessage === 'function') {
    showAccountMessage('Pending approvals are visible to Admin users only. Your current role is ' + getRoleLabel(role) + '.', 'ok');
  }
}

async function initPendingApprovals() {
  const section = document.getElementById('pendingApprovalsSection');
  if (!section) return;

  const tbody = document.querySelector('#pendingUsersTable tbody');
  const refreshButton = document.getElementById('refreshPendingUsersBtn');

  if (AUTO_APPROVAL_ENABLED) {
    showAutoApprovalMessage(section, refreshButton, tbody);
    return;
  }

  const currentUser = firebase.auth().currentUser;
  const role = await getUserRole(currentUser);

  if (currentUser && typeof saveUserAuthState === 'function') {
    saveUserAuthState(currentUser, role);
  }

  if (!isUserAdmin(role, currentUser)) {
    showInsufficientPermissions(section, role);
    return;
  }

  section.style.display = 'block';

  if (refreshButton) {
    refreshButton.addEventListener('click', loadPendingUsers);
  }

  await loadPendingUsers();
}

async function updateUserProfile(displayName, email) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      showAccountMessage('User not authenticated', 'error');
      return;
    }

    // Update display name
    if (displayName && displayName !== user.displayName) {
      await user.updateProfile({
        displayName: displayName
      });
    }

    // Update email if changed
    if (email && email !== user.email) {
      await user.updateEmail(email);
    }

    // Update Firestore
    await firebase.firestore().collection('users').doc(user.uid).update({
      username: displayName,
      email: email,
      updatedAt: new Date().toISOString()
    });

    // Update session storage
    saveUserAuthState(user);

    if (typeof addAuditLog === 'function') {
      addAuditLog('Profile updated', { displayName, email });
    }

    showAccountMessage('Profile updated successfully!', 'ok');
  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      showAccountMessage('Please logout and login again before updating your email', 'error');
    } else if (error.code === 'auth/email-already-in-use') {
      showAccountMessage('Email is already in use by another account', 'error');
    } else if (error.code === 'auth/invalid-email') {
      showAccountMessage('Invalid email address', 'error');
    } else {
      showAccountMessage('Failed to update profile: ' + error.message, 'error');
    }
  }
}

async function changePassword(currentPassword, newPassword) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      showAccountMessage('User not authenticated', 'error');
      return;
    }

    // Re-authenticate user
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);

    // Update password
    await user.updatePassword(newPassword);

    if (typeof addAuditLog === 'function') {
      addAuditLog('Password changed', {});
    }

    showAccountMessage('Password changed successfully!', 'ok');
    
    // Clear form
    document.getElementById('changePasswordForm').reset();
  } catch (error) {
    console.error('Password change error:', error);
    
    if (error.code === 'auth/wrong-password') {
      showAccountMessage('Current password is incorrect', 'error');
    } else if (error.code === 'auth/weak-password') {
      showAccountMessage('New password is too weak (minimum 6 characters)', 'error');
    } else {
      showAccountMessage('Failed to change password: ' + error.message, 'error');
    }
  }
}

async function deleteUserAccount() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      showAccountMessage('User not authenticated', 'error');
      return;
    }

    await firebase.firestore().collection('users').doc(user.uid).set({
      lastSignOutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (typeof addAuditLog === 'function') {
      addAuditLog('Account sign-out requested', {
        userId: user.uid,
        email: user.email || ''
      });
    }

    await firebase.auth().signOut();
    clearUserAuthState();

    showAccountMessage('Signed out successfully. Your account and all records were kept. You can sign in again anytime.', 'ok');
    setTimeout(() => {
      globalThis.location.href = 'index.html';
    }, 1400);
  } catch (error) {
    console.error('Account deletion error:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      showAccountMessage('Please logout and login again before signing out from account settings.', 'error');
    } else {
      showAccountMessage('Failed to sign out safely: ' + error.message, 'error');
    }
  }
}

function clearAllEntriesData() {
  const data = loadData();

  data.daily = {};
  data.auditLogs = [];
  data._meta = data._meta && typeof data._meta === 'object' ? data._meta : {};
  data._meta.recoveredFromBackupAt = Date.now();
  data._meta.recoveredBackupScore = 0;

  saveData(data);

  localStorage.removeItem('twellium_warehouse_portal_backup_v1');
  localStorage.removeItem('dailyRecordingSheetData');
  localStorage.removeItem('dailyBalanceSheetData');
}

function setupAccountManagement() {
  // Wait for Firebase auth to be ready
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      globalThis.location.href = 'login.html';
      return;
    }

    // Populate current user info
    document.getElementById('displayName').value = user.displayName || '';
    document.getElementById('email').value = user.email || '';

  // Setup form handlers
  const updateProfileForm = document.getElementById('updateProfileForm');
  if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('displayName').value.trim();
      const email = document.getElementById('email').value.trim();

      if (!displayName || !email) {
        showAccountMessage('Please fill in all fields', 'error');
        return;
      }

      const submitButton = updateProfileForm.querySelector('button[type="submit"]');
      await withLoadingFeedback(submitButton, 'Updating...', () => updateUserProfile(displayName, email), { overlay: true });
    });
  }

  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmNewPassword').value;

      if (!currentPassword || !newPassword || !confirmPassword) {
        showAccountMessage('Please fill in all password fields', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showAccountMessage('New password must be at least 6 characters', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showAccountMessage('New passwords do not match', 'error');
        return;
      }

      const submitButton = changePasswordForm.querySelector('button[type="submit"]');
      await withLoadingFeedback(submitButton, 'Changing...', () => changePassword(currentPassword, newPassword), { overlay: true });
    });
  }

  // Setup backup/restore
  const backupDataBtn = document.getElementById('backupDataBtn');
  const restoreDataBtn = document.getElementById('restoreDataBtn');
  const clearAllEntriesBtn = document.getElementById('clearAllEntriesBtn');
  const restoreFileInput = document.getElementById('restoreFileInput');

  if (backupDataBtn) {
    backupDataBtn.addEventListener('click', async () => {
      await withLoadingFeedback(backupDataBtn, 'Exporting...', () => {
        const data = loadData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warehouse-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        if (typeof addAuditLog === 'function') {
          addAuditLog('Backup exported', { fileType: 'json' });
        }
        showAccountMessage('Backup exported successfully!', 'ok');
        renderAuditLogTable();
      }, { overlay: true });
    });
  }

  if (restoreDataBtn) {
    restoreDataBtn.addEventListener('click', () => {
      restoreFileInput.click();
    });
  }

  if (clearAllEntriesBtn) {
    clearAllEntriesBtn.addEventListener('click', async () => {
      const approved = confirm('This will clear ALL warehouse entries (daily records and logs). Products and user accounts will remain. Continue?');
      if (!approved) return;

      await withLoadingFeedback(clearAllEntriesBtn, 'Clearing...', () => {
        clearAllEntriesData();
        showAccountMessage('All entries cleared successfully.', 'ok');
      }, { overlay: true });

      setTimeout(() => {
        globalThis.location.reload();
      }, 400);
    });
  }

  if (restoreFileInput) {
    restoreFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const fileContent = await file.text();
        const importedData = JSON.parse(fileContent);
        
        // Validate structure
        if (!importedData.products || !Array.isArray(importedData.products)) {
          showAccountMessage('Invalid backup file format', 'error');
          return;
        }

        // Confirm restore
        if (confirm('This will replace all current data with the backup. Are you sure?')) {
          saveData(importedData);
          if (typeof addAuditLog === 'function') {
            addAuditLog('Backup restored', {
              products: Array.isArray(importedData.products) ? importedData.products.length : 0
            });
          }
          showAccountMessage('Data restored successfully! Reload the page to see changes.', 'ok');
          setTimeout(() => {
            globalThis.location.reload();
          }, 2000);
        }
      } catch (error) {
        showAccountMessage('Failed to restore backup: ' + error.message, 'error');
      }
      e.target.value = ''; // Reset input
    });
  }

  const refreshAuditLogBtn = document.getElementById('refreshAuditLogBtn');
  const clearAuditLogBtn = document.getElementById('clearAuditLogBtn');

  if (refreshAuditLogBtn) {
    refreshAuditLogBtn.addEventListener('click', renderAuditLogTable);
  }

  if (clearAuditLogBtn) {
    clearAuditLogBtn.addEventListener('click', async () => {
      if (!confirm('Clear all audit log entries?')) return;
      await withLoadingFeedback(clearAuditLogBtn, 'Clearing...', () => {
        if (typeof clearAuditLogs === 'function') {
          clearAuditLogs();
        }
        if (typeof addAuditLog === 'function') {
          addAuditLog('Audit log cleared', {});
        }
        renderAuditLogTable();
        showAccountMessage('Audit log cleared.', 'ok');
      }, { overlay: true });
    });
  }

  // Setup delete account modal
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'flex';
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'none';
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      deleteConfirmModal.style.display = 'none';
      await withLoadingFeedback(confirmDeleteBtn, 'Deleting account...', () => deleteUserAccount(), { overlay: true });
    });
  }

  // Close modal when clicking outside
  deleteConfirmModal.addEventListener('click', (e) => {
    if (e.target === deleteConfirmModal) {
      deleteConfirmModal.style.display = 'none';
    }
  });

  renderAuditLogTable();
  initRoleManagement();
  initPendingApprovals();
  }); // Close onAuthStateChanged callback
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAccountManagement);
} else {
  setTimeout(setupAccountManagement, 200);
}
