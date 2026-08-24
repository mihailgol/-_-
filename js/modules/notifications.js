import { appState } from "./state.js";
import { api } from "./utils.js";
import { showToast } from "./ui.js";

let lastUnreadCount = 0;

export async function loadNotifications() {
  if (!appState.user || !appState.user.isLoggedIn) {
    updateNotificationBadge(0);
    return;
  }

  try {
    const data = await api("/api/notifications");
    const notifications = data.notifications || [];
    const unreadCount = data.unreadCount || 0;

    updateNotificationBadge(unreadCount);

    if (unreadCount > lastUnreadCount && lastUnreadCount >= 0) {
      const latest = notifications.find((n) => !n.isRead);
      if (latest) {
        showToast("🔔 Уведомление", latest.message);
      }
    }
    lastUnreadCount = unreadCount;

    renderNotificationList(notifications);
  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

function renderNotificationList(notifications) {
  const container = document.getElementById("notificationList");
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--color-text-secondary); font-size: 0.875rem;">Уведомлений пока нет</div>`;
    return;
  }

  container.innerHTML = notifications
    .map(
      (n) => `
      <div class="notif-item ${n.isRead ? "" : "unread"}" data-id="${n.id}" data-link="${n.link || ""}" style="padding: 12px; border-bottom: 1px solid var(--color-border); cursor: pointer;">
        <div class="notif-icon"><i data-lucide="${n.type === "teacher_review" ? "check-circle-2" : "bell"}" style="stroke: var(--color-purple)"></i></div>
        <div class="notif-content">
          <p style="margin: 0; font-weight: ${n.isRead ? "400" : "600"}; font-size: 0.875rem;">${n.title}</p>
          <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);">${n.message}</p>
          <span class="notif-time" style="font-size: 0.75rem; color: var(--color-text-secondary); opacity: 0.7;">${new Date(n.createdAt).toLocaleDateString("ru-RU")}</span>
        </div>
      </div>
    `
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();

  container.querySelectorAll(".notif-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const id = item.getAttribute("data-id");
      const link = item.getAttribute("data-link");

      try {
        await api(`/api/notifications/${id}/read`, { method: "POST" });
        item.classList.remove("unread");
        loadNotifications();
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }

      if (link && link.startsWith("#")) {
        location.hash = link;
      }
    });
  });
}

export function initNotificationEvents() {
  const btn = document.getElementById("notificationBtn");
  const dropdown = document.getElementById("notificationDropdown");
  const markReadBtn = document.getElementById("markReadBtn");

  if (btn && dropdown) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === "block";
      dropdown.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        loadNotifications();
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  if (markReadBtn) {
    markReadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await api("/api/notifications/read-all", { method: "POST" });
        loadNotifications();
      } catch (err) {
        console.error("Failed to mark all notifications read:", err);
      }
    });
  }
}
