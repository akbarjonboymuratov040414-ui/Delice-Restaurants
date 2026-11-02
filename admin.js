/**
 * admin.js — Delice Admin Panel Logic
 * Manages food items, table reservation orders, and real-time customer notifications.
 */

const currentUsername = localStorage.getItem("username");
const currentPassword = localStorage.getItem("password");
const currentRole     = localStorage.getItem("role");

// Security check: Only admin allowed
if (!currentUsername || !currentPassword || currentRole !== "admin") {
    alert("Bu sahifaga faqat Admin kirishi mumkin. Iltimos, admin sifatida tizimga kiring.");
    window.location.href = "signIN.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Auth Bar Update
    const authEl = document.querySelector(".auth");
    if (authEl && currentUsername) {
        authEl.innerHTML = `
            <a href="#" class="btn btn-outline-warning text-yellow-400 border border-yellow-400 px-3 py-1 rounded-md text-sm font-semibold">${currentUsername} (Admin)</a>
            <a href="signIN.html" id="admin-logout-btn" class="text-white hover:text-red-400 text-sm ml-2">Chiqish (Logout)</a>
        `;
        document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
            localStorage.removeItem("username");
            localStorage.removeItem("password");
            localStorage.removeItem("role");
        });
    }

    // 2. Existing Food Creation Form (Preserved 100%)
    const foodForm = document.querySelector(".admin-form");
    if (foodForm) {
        foodForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const title = document.querySelector("#title").value.trim();
            const rasm  = document.querySelector("#rasm").value.trim();
            const narxi = document.querySelector("#talimYonalishi").value.trim();

            let products = JSON.parse(localStorage.getItem("Products") || "[]");
            const newId = products.reduce((maxId, p) => Math.max(maxId, Number(p.id) || 0), 0) + 1;

            products.push({
                id: newId,
                type: "food",
                fio: title,
                kursi: narxi,
                rasm: rasm,
            });

            localStorage.setItem("Products", JSON.stringify(products));
            foodForm.reset();
            alert("Taom menyuga muvaffaqiyatli qo'shildi!");
        });
    }

    // 3. Render Table Reservations & Notifications
    renderDashboard();

    // 4. Mark all notifications as read
    document.getElementById("btn-mark-all-read")?.addEventListener("click", () => {
        let notifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]");
        notifs.forEach(n => n.read = true);
        localStorage.setItem("deliceAdminNotifications", JSON.stringify(notifs));
        renderDashboard();
    });

    // 5. Clear notifications history
    document.getElementById("btn-clear-notifs")?.addEventListener("click", () => {
        if (confirm("Haqiqatan ham barcha xabarnomalar tarixini tozalamoqchimisiz?")) {
            localStorage.setItem("deliceAdminNotifications", "[]");
            renderDashboard();
        }
    });

    // 6. Real-time auto refresh every 4 seconds
    setInterval(renderDashboard, 4000);
});

// ─── Render Dashboard Helper ──────────────────────────────────────────────────
function renderDashboard() {
    renderReservations();
    renderNotifications();
}

function toMs(date, time) {
    return new Date(date + "T" + time + ":00").getTime();
}

function renderReservations() {
    const tbody = document.getElementById("reservations-tbody");
    if (!tbody) return;

    const reservations = JSON.parse(localStorage.getItem("deliceReservations") || "[]");
    const nowMs = Date.now();

    // Sort by date and start time descending (newest first)
    reservations.sort((a, b) => toMs(b.date, b.startTime) - toMs(a.date, a.startTime));

    let activeCount = 0;
    let upcomingCount = 0;

    if (reservations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-6 text-neutral-500">
                    Hozircha bron qilingan stollar yo'q.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = reservations.map(r => {
            const startMs = toMs(r.date, r.startTime);
            let endMs = toMs(r.date, r.endTime);
            if (r.endTime <= r.startTime) endMs += 24 * 3600 * 1000;

            let statusLabel = "";
            let statusClass = "";

            if (startMs <= nowMs && nowMs < endMs) {
                statusLabel = "🟢 Faol (Ayni vaqtda)";
                statusClass = "status-active";
                activeCount++;
            } else if (startMs > nowMs) {
                statusLabel = "📅 Kutilmoqda";
                statusClass = "status-upcoming";
                upcomingCount++;
            } else {
                statusLabel = "⚫ Tugagan";
                statusClass = "status-past";
            }

            return `
                <tr>
                    <td class="font-bold text-amber-400">Table ${r.tableId}</td>
                    <td>
                        <div class="font-semibold text-white">${escapeHtml(r.customerName)}</div>
                        ${r.username ? `<div class="text-xs text-neutral-400">@${escapeHtml(r.username)}</div>` : ''}
                    </td>
                    <td><a href="tel:${r.phone}" class="text-yellow-300 hover:underline">${escapeHtml(r.phone)}</a></td>
                    <td>${escapeHtml(r.date)}</td>
                    <td class="font-mono text-sm">${escapeHtml(r.startTime)} - ${escapeHtml(r.endTime)}</td>
                    <td>${r.guests} kishi</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td class="text-xs text-neutral-300 max-w-[180px] truncate" title="${escapeHtml(r.specialRequests || '')}">
                        ${r.specialRequests ? escapeHtml(r.specialRequests) : '<span class="text-neutral-500">-</span>'}
                    </td>
                    <td>
                        <button class="btn-del" onclick="deleteReservation('${r.id}', ${r.tableId})">Bekor qilish</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Update Stats
    setText("stat-total-res", reservations.length);
    setText("stat-active-res", activeCount);
    setText("stat-upcoming-res", upcomingCount);
    setText("res-count-badge", reservations.length);
}

function renderNotifications() {
    const listEl = document.getElementById("notifications-list");
    if (!listEl) return;

    const notifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]");
    const unreadCount = notifs.filter(n => !n.read).length;

    setText("stat-unread-notifs", unreadCount);
    const unreadBadge = document.getElementById("notif-unread-badge");
    if (unreadBadge) {
        unreadBadge.textContent = `${unreadCount} YANGI`;
        unreadBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
    }

    if (notifs.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-6 text-neutral-500">
                Hozircha yangi xabarnomalar yo'q.
            </div>
        `;
        return;
    }

    listEl.innerHTML = notifs.slice(0, 15).map(n => {
        return `
            <div class="notif-item ${n.read ? '' : 'is-unread'}">
                <div class="flex items-start gap-3">
                    <span class="text-xl mt-0.5">${n.read ? '📨' : '🔔'}</span>
                    <div>
                        <div class="font-medium text-white ${n.read ? '' : 'text-amber-300'}">
                            ${escapeHtml(n.text || n.message || 'Yangi stol broni')}
                        </div>
                        <div class="text-xs text-neutral-400 mt-1">
                            Mijoz: <strong>${escapeHtml(n.customerName || '')}</strong> | Tel: <strong>${escapeHtml(n.phone || '')}</strong> | Vaqt: ${escapeHtml(n.createdAt || '')}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${!n.read ? `<button class="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded border border-amber-500/40" onclick="markOneRead('${n.id}')">O'qildi</button>` : ''}
                </div>
            </div>
        `;
    }).join("");
}

// Global actions
window.deleteReservation = function (id, tableId) {
    if (!confirm(`Haqiqatan ham Table ${tableId} uchun bronni bekor qilmoqchimisiz?`)) return;

    let reservations = JSON.parse(localStorage.getItem("deliceReservations") || "[]");
    reservations = reservations.filter(r => r.id !== id);
    localStorage.setItem("deliceReservations", JSON.stringify(reservations));

    // Also record cancellation notice
    let notifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]");
    notifs.unshift({
        id: "cancel_" + Date.now(),
        type: "cancellation",
        createdAt: new Date().toLocaleString(),
        read: true,
        text: `Admin tomonidan Table ${tableId} broni bekor qilindi.`
    });
    localStorage.setItem("deliceAdminNotifications", JSON.stringify(notifs));

    renderDashboard();
};

window.markOneRead = function (notifId) {
    let notifs = JSON.parse(localStorage.getItem("deliceAdminNotifications") || "[]");
    const target = notifs.find(n => n.id === notifId);
    if (target) {
        target.read = true;
        localStorage.setItem("deliceAdminNotifications", JSON.stringify(notifs));
        renderDashboard();
    }
};

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
