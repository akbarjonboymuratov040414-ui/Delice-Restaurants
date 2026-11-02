/**
 * reservations.js — Delice Table Reservation Logic
 * Plain (non-module) script. All reservation state in localStorage under 'deliceReservations'.
 */

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────
  var STORAGE_KEY = 'deliceReservations';

  var TABLE_CONFIG = [
    { id: 1, capacity: 2 },
    { id: 2, capacity: 2 },
    { id: 3, capacity: 4 },
    { id: 4, capacity: 4 },
    { id: 5, capacity: 6 },
    { id: 6, capacity: 4 },
    { id: 7, capacity: 2 },
    { id: 8, capacity: 4 },
  ];

  // ─── State ───────────────────────────────────────────────────────────────────
  var selectedTableId = null;
  var tableStatuses   = {};   // tableId -> 'available' | 'reserved' | 'upcoming'

  // ─── Storage helpers ─────────────────────────────────────────────────────────
  function loadReservations() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReservations(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      showToast('Storage error — reservation may not have been saved.', 'error');
    }
  }

  // ─── Time helpers ────────────────────────────────────────────────────────────
  function toMs(date, time) {
    // date: "YYYY-MM-DD", time: "HH:MM"
    return new Date(date + 'T' + time + ':00').getTime();
  }

  function padTwo(n) {
    return String(n).padStart(2, '0');
  }

  function computeEndTime(date, startTime, durationMinutes) {
    var startMs   = toMs(date, startTime);
    var endMs     = startMs + durationMinutes * 60000;
    var endDate   = new Date(endMs);
    var startDate = new Date(startMs);

    var endStr = padTwo(endDate.getHours()) + ':' + padTwo(endDate.getMinutes());
    var crossesMidnight = endDate.getDate() !== startDate.getDate();
    return { endTime: endStr, crossesMidnight: crossesMidnight, endMs: endMs };
  }

  // ─── Conflict detection ───────────────────────────────────────────────────────
  function hasConflict(tableId, date, startTime, endTime, excludeId) {
    var reservations = loadReservations();
    var s1 = toMs(date, startTime);
    var e1 = toMs(date, endTime);

    // Handle midnight crossing: if endTime < startTime lexicographically treat e1 as next day
    if (endTime <= startTime) {
      e1 += 24 * 3600 * 1000;
    }

    return reservations.some(function (r) {
      if (r.tableId !== tableId) return false;
      if (excludeId && r.id === excludeId) return false;

      var s2 = toMs(r.date, r.startTime);
      var e2 = toMs(r.date, r.endTime);
      if (r.endTime <= r.startTime) e2 += 24 * 3600 * 1000;

      // Overlap: s1 < e2 && s2 < e1   (back-to-back OK: s1===e2 or s2===e1 → no overlap)
      return s1 < e2 && s2 < e1;
    });
  }

  // ─── Status queries ───────────────────────────────────────────────────────────
  function getActiveReservationForTable(tableId, nowMs) {
    var reservations = loadReservations();
    return reservations.find(function (r) {
      if (r.tableId !== tableId) return false;
      var s = toMs(r.date, r.startTime);
      var e = toMs(r.date, r.endTime);
      if (r.endTime <= r.startTime) e += 24 * 3600 * 1000;
      return s <= nowMs && nowMs < e;
    }) || null;
  }

  function getFutureReservationsForTable(tableId, nowMs) {
    var reservations = loadReservations();
    return reservations.filter(function (r) {
      if (r.tableId !== tableId) return false;
      var s = toMs(r.date, r.startTime);
      return s > nowMs;
    }).sort(function (a, b) {
      return toMs(a.date, a.startTime) - toMs(b.date, b.startTime);
    });
  }

  function reservationStatus(tableId, nowMs) {
    var active = getActiveReservationForTable(tableId, nowMs);
    if (active) return 'reserved';
    var future = getFutureReservationsForTable(tableId, nowMs);
    // "upcoming" = starts within next 2 hours
    if (future.length) {
      var nextStart = toMs(future[0].date, future[0].startTime);
      if (nextStart - nowMs <= 2 * 3600 * 1000) return 'upcoming';
    }
    return 'available';
  }

  // ─── Recalculate all statuses ─────────────────────────────────────────────────
  function recalculateAllTableStatuses() {
    var nowMs = Date.now();
    TABLE_CONFIG.forEach(function (tbl) {
      var status = reservationStatus(tbl.id, nowMs);
      tableStatuses[tbl.id] = status;

      // Don't override 'selected' highlight in 3D
      if (tbl.id !== selectedTableId) {
        if (typeof window.updateTableColor === 'function') {
          window.updateTableColor(tbl.id, status);
        }
      }
    });

    // Refresh info panel if a table is selected
    if (selectedTableId) {
      refreshInfoPanel(selectedTableId);
    }
  }

  // ─── Info panel ───────────────────────────────────────────────────────────────
  function refreshInfoPanel(tableId) {
    var nowMs = Date.now();
    var tblCfg = TABLE_CONFIG.find(function (t) { return Number(t.id) === Number(tableId); });
    if (!tblCfg) return;

    var status  = reservationStatus(tableId, nowMs);
    var active  = getActiveReservationForTable(tableId, nowMs);
    var future  = getFutureReservationsForTable(tableId, nowMs);

    // Show details section, hide placeholder
    var placeholder = document.querySelector('.tip-placeholder');
    var details     = document.querySelector('.tip-details');
    if (placeholder) placeholder.style.display = 'none';
    if (details)     details.style.display     = 'flex';

    setText('tip-tnum', tableId);
    setText('tip-cap',  tblCfg.capacity);

    // Status badge
    var badge = document.getElementById('tip-status-badge');
    if (badge) {
      badge.className = 'tip-status-badge status--' + status;
      badge.textContent = capitalize(status);
    }

    // Reservation info
    var resInfo  = document.getElementById('tip-reservation-info');
    var resBtn   = document.getElementById('tip-reserve-btn');
    var unavMsg  = document.getElementById('tip-unavail-msg');

    if (resInfo)  resInfo.style.display  = 'none';
    if (resBtn)   resBtn.style.display   = 'none';
    if (unavMsg)  unavMsg.style.display  = 'none';

    if (status === 'reserved' && active) {
      var firstName = (active.customerName || '').split(' ')[0];
      if (resInfo) {
        resInfo.innerHTML =
          '<strong>Reserved until:</strong> ' + active.endTime + '<br>' +
          '<strong>Guest:</strong> ' + escHtml(firstName) + '<br>' +
          '<strong>Guests:</strong> ' + active.guests;
        resInfo.style.display = 'block';
      }
      if (unavMsg) {
        unavMsg.textContent = 'This table is currently occupied.';
        unavMsg.style.display = 'block';
      }
    } else if (status === 'upcoming' && future.length) {
      var next = future[0];
      if (resInfo) {
        resInfo.innerHTML =
          '<strong>Next booking at:</strong> ' + next.startTime +
          ' on ' + formatDate(next.date) + '<br>' +
          '<strong>Guests:</strong> ' + next.guests;
        resInfo.style.display = 'block';
      }
      if (resBtn) resBtn.style.display = 'block';
    } else if (status === 'available') {
      if (resBtn) resBtn.style.display = 'block';
    }
  }

  // ─── Table click (called by 3D scene) ─────────────────────────────────────────
  window.onTableClick = function (tableId) {
    tableId = Number(tableId);

    // Revert previous selection colour in 3D
    if (selectedTableId && selectedTableId !== tableId) {
      var prevStatus = tableStatuses[selectedTableId] || 'available';
      if (typeof window.updateTableColor === 'function') {
        window.updateTableColor(selectedTableId, prevStatus);
      }
    }

    selectedTableId           = tableId;
    window._selectedTableId   = tableId;
    tableStatuses[tableId]    = tableStatuses[tableId] || 'available';

    // Highlight in 3D
    if (typeof window.updateTableColor === 'function') {
      window.updateTableColor(tableId, 'selected');
    }

    // Update right-hand info panel
    refreshInfoPanel(tableId);

    // Open reservation form modal immediately for customer convenience!
    var nowMs = Date.now();
    var status = reservationStatus(tableId, nowMs);
    if (status === 'available' || status === 'upcoming') {
      window.openReservationModal(tableId);
    }
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────────
  window.openReservationModal = function (tableId) {
    if (!tableId) return;

    // REQUIREMENT: Agar login qilinmagan bulsa signin.html ga utkazsin
    var loggedInUser = localStorage.getItem("username");
    var loggedInPass = localStorage.getItem("password");
    if (!loggedInUser || !loggedInPass) {
      sessionStorage.setItem("pendingReserveTableId", String(tableId));
      alert("Stol bron qilish uchun avval tizimga kiring (Login qiling)!");
      window.location.href = "signIN.html";
      return;
    }

    var tblCfg = TABLE_CONFIG.find(function (t) { return Number(t.id) === Number(tableId); });
    if (!tblCfg) return;

    setText('modal-tnum', tableId);

    // Default date = today
    var today = getTodayStr();
    var dateInput = document.getElementById('res-date');
    if (dateInput) { dateInput.value = today; dateInput.min = today; }

    // Default time = next full hour
    var timeInput = document.getElementById('res-time');
    if (timeInput) timeInput.value = nextFullHour();

    // Prefill user's name if logged in
    setVal('res-name',     loggedInUser || '');
    setVal('res-phone',    '');
    setVal('res-duration', '');
    setVal('res-guests',   '');
    setVal('res-special',  '');

    // Set guests max
    var guestsInput = document.getElementById('res-guests');
    if (guestsInput) guestsInput.max = tblCfg.capacity;

    // Hide summary and error
    var summary = document.getElementById('res-summary');
    var errBox  = document.getElementById('res-form-error');
    if (summary) summary.style.display = 'none';
    if (errBox)  errBox.style.display  = 'none';

    // Show modal
    var modal = document.getElementById('reservation-modal');
    if (modal) modal.style.display = 'flex';

    // Focus phone or name
    var phoneInput = document.getElementById('res-phone');
    if (phoneInput) setTimeout(function () { phoneInput.focus(); }, 100);
  };

  window.closeReservationModal = function () {
    var modal = document.getElementById('reservation-modal');
    if (modal) modal.style.display = 'none';
    var errBox = document.getElementById('res-form-error');
    if (errBox) errBox.style.display = 'none';
  };

  // ─── Submit reservation ───────────────────────────────────────────────────────
  window.submitReservation = function () {
    var tableId  = window._selectedTableId;
    if (!tableId) { showFormError('No table selected.'); return; }

    // Double check authentication
    var loggedInUser = localStorage.getItem("username");
    var loggedInPass = localStorage.getItem("password");
    if (!loggedInUser || !loggedInPass) {
      sessionStorage.setItem("pendingReserveTableId", String(tableId));
      alert("Stol bron qilish uchun avval tizimga kiring (Login qiling)!");
      window.location.href = "signIN.html";
      return;
    }

    var tblCfg   = TABLE_CONFIG.find(function (t) { return Number(t.id) === Number(tableId); });
    var name     = (getVal('res-name')     || '').trim();
    var phone    = (getVal('res-phone')    || '').trim();
    var date     = (getVal('res-date')     || '').trim();
    var startTime= (getVal('res-time')     || '').trim();
    var durStr   = (getVal('res-duration') || '').trim();
    var guestsStr= (getVal('res-guests')   || '').trim();
    var special  = (getVal('res-special')  || '').trim();

    var errors = [];

    if (!name)  errors.push('Full name is required.');
    if (!phone || !/\d{7,}/.test(phone.replace(/\D/g, '')))
      errors.push('A valid phone number (at least 7 digits) is required.');

    var today = getTodayStr();
    if (!date) {
      errors.push('Reservation date is required.');
    } else if (date < today) {
      errors.push('Reservation date cannot be in the past.');
    }

    if (!startTime) {
      errors.push('Start time is required.');
    } else if (date === today) {
      var nowHHMM = nowTimeStr();
      if (startTime < nowHHMM) errors.push('Start time cannot be in the past.');
    }

    var durationMinutes = parseInt(durStr, 10);
    if (!durStr || isNaN(durationMinutes) || durationMinutes < 1) {
      errors.push('Please select a duration.');
    }

    var guests = parseInt(guestsStr, 10);
    if (!guestsStr || isNaN(guests) || guests < 1) {
      errors.push('Number of guests must be at least 1.');
    } else if (tblCfg && guests > tblCfg.capacity) {
      errors.push('Number of guests (' + guests + ') exceeds table capacity (' + tblCfg.capacity + ').');
    }

    if (errors.length) {
      showFormError(errors.join('<br>'));
      return;
    }

    var endResult = computeEndTime(date, startTime, durationMinutes);
    var endTime   = endResult.endTime;

    if (hasConflict(tableId, date, startTime, endTime, null)) {
      showFormError(
        'This time slot conflicts with an existing reservation for Table ' + tableId + '.<br>' +
        'Please choose a different time or duration.'
      );
      return;
    }

    var reservation = {
      id:              generateUUID(),
      tableId:         tableId,
      customerName:    name,
      username:        loggedInUser,
      phone:           phone,
      date:            date,
      startTime:       startTime,
      endTime:         endTime,
      durationMinutes: durationMinutes,
      guests:          guests,
      specialRequests: special,
      createdAt:       new Date().toISOString(),
    };

    var reservations = loadReservations();
    reservations.push(reservation);
    saveReservations(reservations);

    // REQUIREMENT: Joy bron qilinganligi haqida adminga ham xabar borsin
    try {
      var adminNotifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]");
      adminNotifs.unshift({
        id: "notif_" + Date.now(),
        type: "table_reservation",
        tableId: tableId,
        customerName: name,
        username: loggedInUser,
        phone: phone,
        date: date,
        startTime: startTime,
        endTime: endTime,
        durationMinutes: durationMinutes,
        guests: guests,
        specialRequests: special,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now(),
        read: false,
        text: "Yangi bron: Stol #" + tableId + " - " + name + " (" + phone + ") tomonidan " + date + " " + startTime + "-" + endTime + " ga (" + guests + " kishi)."
      });
      localStorage.setItem("deliceAdminNotifications", JSON.stringify(adminNotifs));
    } catch (e) {
      console.error("Admin notification save error:", e);
    }

    // Update 3D and status
    recalculateAllTableStatuses();

    showToast('✅ Table ' + tableId + ' reserved for ' + name + ' on ' + formatDate(date) + ' at ' + startTime + '. Xabar adminga yuborildi!', 'success');
    window.closeReservationModal();
    refreshInfoPanel(tableId);
  };

  // ─── Toast notifications ──────────────────────────────────────────────────────
  window.showToast = function (message, type) {
    type = type || 'info';
    var container = document.getElementById('res-toast');
    if (!container) return;

    var item = document.createElement('div');
    item.className = 'res-toast-item res-toast-item--' + type;
    item.innerHTML = message;
    container.appendChild(item);

    setTimeout(function () {
      item.classList.add('res-toast-hide');
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 350);
    }, 4000);
  };
  var showToast = window.showToast;

  // ─── Summary update ───────────────────────────────────────────────────────────
  function updateSummary() {
    var tableId   = window._selectedTableId;
    var date      = getVal('res-date');
    var startTime = getVal('res-time');
    var durStr    = getVal('res-duration');
    var guests    = getVal('res-guests');
    var summary   = document.getElementById('res-summary');

    if (!date || !startTime || !durStr) {
      if (summary) summary.style.display = 'none';
      return;
    }

    var dur = parseInt(durStr, 10);
    if (isNaN(dur)) { if (summary) summary.style.display = 'none'; return; }

    var endResult = computeEndTime(date, startTime, dur);
    var durLabel  = formatDuration(dur);
    var tblCfg    = tableId ? TABLE_CONFIG.find(function(t){return t.id===tableId;}) : null;

    setText('sum-table',  tableId ? 'Table ' + tableId : '-');
    setText('sum-date',   formatDate(date));
    setText('sum-time',   startTime);
    setText('sum-end',    endResult.endTime + (endResult.crossesMidnight ? ' (+1 day)' : ''));
    setText('sum-dur',    durLabel);
    setText('sum-guests', guests || '-');
    setText('sum-cap',    tblCfg ? tblCfg.capacity + ' guests' : '-');

    if (summary) summary.style.display = 'block';
  }

  // ─── DOMContentLoaded setup ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Periodic recalculation
    setInterval(recalculateAllTableStatuses, 60000);

    // Delayed initial status calculation (give 3D scene time to init)
    setTimeout(recalculateAllTableStatuses, 500);

    // Modal backdrop close
    var modal = document.getElementById('reservation-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) window.closeReservationModal();
      });
    }

    // Summary auto-update
    ['res-date', 'res-time', 'res-duration', 'res-guests'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', updateSummary);
    });

    // Min date for date picker
    var dateInput = document.getElementById('res-date');
    if (dateInput) dateInput.min = getTodayStr();

    // Keyboard close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = document.getElementById('reservation-modal');
        if (m && m.style.display !== 'none') window.closeReservationModal();
      }
    });

    // Restore pending reservation if user just logged in via signIN.html
    try {
      var pendingTable = sessionStorage.getItem('pendingReserveTableId');
      var user = localStorage.getItem('username');
      var pass = localStorage.getItem('password');
      if (pendingTable && user && pass) {
        sessionStorage.removeItem('pendingReserveTableId');
        setTimeout(function () {
          var tid = parseInt(pendingTable, 10);
          if (typeof window.onTableClick === 'function') {
            window.onTableClick(tid);
          }
          var reserveSec = document.getElementById('reserve-section');
          if (reserveSec) {
            reserveSec.scrollIntoView({ behavior: 'smooth' });
          }
          setTimeout(function () {
            window.openReservationModal(tid);
          }, 400);
        }, 800);
      }
    } catch (err) {
      console.warn('Pending table restore check:', err);
    }
  });

  // ─── Utility functions ────────────────────────────────────────────────────────
  function showFormError(msg) {
    var errBox = document.getElementById('res-form-error');
    if (errBox) {
      errBox.innerHTML = msg;
      errBox.style.display = 'block';
      errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function getText(id) {
    var el = document.getElementById(id);
    return el ? el.textContent : '';
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      padTwo(d.getMonth() + 1) + '-' +
      padTwo(d.getDate());
  }

  function nowTimeStr() {
    var d = new Date();
    return padTwo(d.getHours()) + ':' + padTwo(d.getMinutes());
  }

  function nextFullHour() {
    var d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return padTwo(d.getHours()) + ':00';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
  }

  function formatDuration(minutes) {
    if (minutes < 60) return minutes + ' min';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return m ? h + 'h ' + m + 'min' : h + ' hour' + (h > 1 ? 's' : '');
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

})();
