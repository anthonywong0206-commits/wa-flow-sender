const messageInput = document.getElementById("messageInput");
const recipientsInput = document.getElementById("recipientsInput");
const charCount = document.getElementById("charCount");
const previewBox = document.getElementById("previewBox");
const totalCount = document.getElementById("totalCount");
const validCount = document.getElementById("validCount");
const duplicateCount = document.getElementById("duplicateCount");
const invalidCount = document.getElementById("invalidCount");
const intervalInput = document.getElementById("intervalInput");
const targetMode = document.getElementById("targetMode");
const consentCheck = document.getElementById("consentCheck");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const logBox = document.getElementById("logBox");
const csvInput = document.getElementById("csvInput");
const templateRow = document.getElementById("templateRow");
const templateList = document.getElementById("templateList");
const templateCount = document.getElementById("templateCount");
const templateFormTitle = document.getElementById("templateFormTitle");
const templateIdInput = document.getElementById("templateIdInput");
const templateNameInput = document.getElementById("templateNameInput");
const templateContentInput = document.getElementById("templateContentInput");
const templatePreviewBox = document.getElementById("templatePreviewBox");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const resetTemplateFormBtn = document.getElementById("resetTemplateFormBtn");
const resetDefaultTemplatesBtn = document.getElementById("resetDefaultTemplatesBtn");
const goSettingsBtn = document.getElementById("goSettingsBtn");

let queue = [];
let currentIndex = 0;
let timer = null;
let isPaused = false;
let logs = [];
let templates = [];

const DEFAULT_TEMPLATES = [
  {
    id: "event",
    name: "活動通知",
    content: "你好 {{name}}，提提你活動將於明天舉行。\n\n時間：下午 2:00\n地點：請參閱活動通知\n\n如有查詢，歡迎回覆此訊息。謝謝！"
  },
  {
    id: "follow",
    name: "客戶跟進",
    content: "你好 {{name}}，多謝你早前查詢 {{company}} 的資料。\n\n我想跟進一下你是否需要進一步協助？"
  },
  {
    id: "festival",
    name: "節日祝福",
    content: "你好 {{name}}，祝你節日快樂！\n\n願你和家人身體健康、生活愉快 😊"
  },
  {
    id: "promo",
    name: "宣傳推廣",
    content: "你好 {{name}}，我們現正推出最新活動／服務資訊。\n\n有興趣了解更多，可直接回覆此訊息。"
  }
];

function cloneDefaultTemplates() {
  return DEFAULT_TEMPLATES.map(template => ({ ...template }));
}

function generateId() {
  return `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function saveState() {
  localStorage.setItem("waFlowState", JSON.stringify({
    message: messageInput.value,
    recipients: recipientsInput.value,
    interval: intervalInput.value
  }));
}

function loadState() {
  const raw = localStorage.getItem("waFlowState");
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    messageInput.value = state.message || "";
    recipientsInput.value = state.recipients || "";
    intervalInput.value = state.interval || 3;
  } catch {}
}

function loadTemplates() {
  const raw = localStorage.getItem("waFlowTemplates");
  if (!raw) {
    templates = cloneDefaultTemplates();
    saveTemplates();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      templates = cloneDefaultTemplates();
    } else {
      templates = parsed.filter(item => item && item.name && item.content).map(item => ({
        id: item.id || generateId(),
        name: item.name,
        content: item.content
      }));
    }
  } catch {
    templates = cloneDefaultTemplates();
  }
  saveTemplates();
}

function saveTemplates() {
  localStorage.setItem("waFlowTemplates", JSON.stringify(templates));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function parseRecipients() {
  const rows = recipientsInput.value.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  const seen = new Set();
  const valid = [];
  const invalid = [];
  let duplicates = 0;

  for (const row of rows) {
    const parts = row.split(",").map(p => p.trim());
    const phone = normalizePhone(parts[0]);
    const name = parts[1] || "";
    const company = parts[2] || "";

    if (phone.length < 8 || phone.length > 15) {
      invalid.push({ row, reason: "電話號碼長度不正確" });
      continue;
    }

    if (seen.has(phone)) {
      duplicates++;
      continue;
    }

    seen.add(phone);
    valid.push({ phone, name, company, row });
  }

  return { valid, invalid, duplicates, total: rows.length };
}

function renderPreview() {
  const parsed = parseRecipients();
  const first = parsed.valid[0] || { phone: "85291234567", name: "Chan Tai Man", company: "ABC Company" };
  const preview = personalize(messageInput.value, first).trim();
  previewBox.textContent = preview || "請先輸入訊息內容";
  charCount.textContent = `${messageInput.value.length} 字`;

  totalCount.textContent = parsed.total;
  validCount.textContent = parsed.valid.length;
  duplicateCount.textContent = parsed.duplicates;
  invalidCount.textContent = parsed.invalid.length;
}

function renderTemplatePreview() {
  const sample = { phone: "85291234567", name: "Chan Tai Man", company: "ABC Company" };
  const preview = personalize(templateContentInput.value, sample).trim();
  templatePreviewBox.textContent = preview || "請輸入模板內容";
}

function personalize(message, recipient) {
  return message
    .replaceAll("{{name}}", recipient.name || "")
    .replaceAll("{{phone}}", recipient.phone || "")
    .replaceAll("{{company}}", recipient.company || "");
}

function makeWaLink(recipient) {
  const text = personalize(messageInput.value, recipient);
  return `https://wa.me/${recipient.phone}?text=${encodeURIComponent(text)}`;
}

function addLog(text, type = "normal") {
  const item = {
    time: new Date().toLocaleTimeString(),
    text,
    type
  };
  logs.unshift(item);
  logs = logs.slice(0, 200);
  renderLog();
}

function renderLog() {
  logBox.innerHTML = logs.map(log => `
    <div class="log-item ${log.type === "error" ? "error" : ""}">
      [${log.time}] ${escapeHtml(log.text)}
    </div>
  `).join("");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[m]));
}

function updateProgress() {
  const total = queue.length || 1;
  const percent = Math.min(100, Math.round((currentIndex / total) * 100));
  progressBar.style.width = `${percent}%`;
  statusText.textContent = queue.length
    ? `已開啟 ${currentIndex} / ${queue.length}`
    : "未開始";
}

function openNext() {
  if (isPaused) return;
  if (currentIndex >= queue.length) {
    clearInterval(timer);
    timer = null;
    statusText.textContent = "完成";
    progressBar.style.width = "100%";
    addLog("全部 wa.me 連結已開啟。請於 WhatsApp 內確認及手動發送。");
    return;
  }

  const recipient = queue[currentIndex];
  const link = makeWaLink(recipient);

  if (targetMode.value === "same") {
    window.location.href = link;
  } else {
    window.open(link, "_blank", "noopener,noreferrer");
  }

  currentIndex++;
  addLog(`已開啟：${recipient.phone}${recipient.name ? " / " + recipient.name : ""}`);
  updateProgress();
}

function startSending() {
  const parsed = parseRecipients();

  if (!consentCheck.checked) {
    alert("請先確認收訊者已同意接收相關 WhatsApp 訊息。");
    return;
  }

  if (!messageInput.value.trim()) {
    alert("請先輸入訊息內容。");
    return;
  }

  if (!parsed.valid.length) {
    alert("請先輸入有效電話號碼。");
    return;
  }

  queue = parsed.valid;
  currentIndex = 0;
  isPaused = false;
  clearInterval(timer);

  const interval = Math.max(1, Math.min(60, Number(intervalInput.value) || 3)) * 1000;
  addLog(`開始開啟 ${queue.length} 個 wa.me 連結，間隔 ${interval / 1000} 秒。`);
  updateProgress();
  openNext();
  timer = setInterval(openNext, interval);
}

function pauseSending() {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "繼續" : "暫停";
  statusText.textContent = isPaused ? "已暫停" : `已開啟 ${currentIndex} / ${queue.length}`;
  if (!isPaused && queue.length) {
    openNext();
  }
}

function stopSending() {
  clearInterval(timer);
  timer = null;
  isPaused = false;
  pauseBtn.textContent = "暫停";
  queue = [];
  currentIndex = 0;
  progressBar.style.width = "0%";
  statusText.textContent = "已停止";
  addLog("已停止。");
}

function exportLogs() {
  const content = [
    ["Time", "Record"],
    ...logs.map(log => [log.time, log.text])
  ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wa-flow-sender-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadDemo() {
  const firstTemplate = templates[0] || DEFAULT_TEMPLATES[0];
  messageInput.value = firstTemplate.content;
  recipientsInput.value = "85291234567, Chan Tai Man, ABC Company\n85298765432, Wong Siu Ming, XYZ Limited\n85261234567, Lee Ka Yan, Example NGO";
  intervalInput.value = 3;
  saveState();
  renderPreview();
}

function applyTemplate(id) {
  const template = templates.find(item => item.id === id);
  if (!template) return;
  messageInput.value = template.content;
  saveState();
  renderPreview();
  showPage("senderPage");
}

function renderTemplates() {
  renderTemplateButtons();
  renderTemplateList();
}

function renderTemplateButtons() {
  if (!templates.length) {
    templateRow.innerHTML = `<p class="empty-text">暫時未有模板，請到設定頁新增。</p>`;
    return;
  }

  templateRow.innerHTML = templates.map(template => `
    <button data-template-id="${escapeHtml(template.id)}">${escapeHtml(template.name)}</button>
  `).join("");

  templateRow.querySelectorAll("[data-template-id]").forEach(btn => {
    btn.addEventListener("click", () => applyTemplate(btn.dataset.templateId));
  });
}

function renderTemplateList() {
  templateCount.textContent = `${templates.length} 個模板`;

  if (!templates.length) {
    templateList.innerHTML = `<div class="empty-card">暫時未有模板。你可以在右邊新增第一個常用模板。</div>`;
    return;
  }

  templateList.innerHTML = templates.map(template => `
    <article class="template-item">
      <div>
        <h3>${escapeHtml(template.name)}</h3>
        <p>${escapeHtml(template.content).replaceAll("\n", "<br>")}</p>
      </div>
      <div class="template-item-actions">
        <button class="small-btn" data-use-template="${escapeHtml(template.id)}">使用</button>
        <button class="small-btn" data-edit-template="${escapeHtml(template.id)}">修改</button>
        <button class="small-btn danger-btn" data-delete-template="${escapeHtml(template.id)}">刪除</button>
      </div>
    </article>
  `).join("");

  templateList.querySelectorAll("[data-use-template]").forEach(btn => {
    btn.addEventListener("click", () => applyTemplate(btn.dataset.useTemplate));
  });

  templateList.querySelectorAll("[data-edit-template]").forEach(btn => {
    btn.addEventListener("click", () => editTemplate(btn.dataset.editTemplate));
  });

  templateList.querySelectorAll("[data-delete-template]").forEach(btn => {
    btn.addEventListener("click", () => deleteTemplate(btn.dataset.deleteTemplate));
  });
}

function editTemplate(id) {
  const template = templates.find(item => item.id === id);
  if (!template) return;
  templateIdInput.value = template.id;
  templateNameInput.value = template.name;
  templateContentInput.value = template.content;
  templateFormTitle.textContent = "修改模板";
  saveTemplateBtn.textContent = "更新模板";
  renderTemplatePreview();
  templateNameInput.focus();
}

function deleteTemplate(id) {
  const template = templates.find(item => item.id === id);
  if (!template) return;
  if (!confirm(`確定刪除「${template.name}」？`)) return;
  templates = templates.filter(item => item.id !== id);
  saveTemplates();
  renderTemplates();

  if (templateIdInput.value === id) {
    resetTemplateForm();
  }
}

function saveTemplateFromForm() {
  const name = templateNameInput.value.trim();
  const content = templateContentInput.value.trim();
  const id = templateIdInput.value;

  if (!name) {
    alert("請輸入模板名稱。");
    return;
  }

  if (!content) {
    alert("請輸入模板內容。");
    return;
  }

  if (id) {
    templates = templates.map(item => item.id === id ? { ...item, name, content } : item);
  } else {
    templates.push({ id: generateId(), name, content });
  }

  saveTemplates();
  renderTemplates();
  resetTemplateForm();
}

function resetTemplateForm() {
  templateIdInput.value = "";
  templateNameInput.value = "";
  templateContentInput.value = "";
  templateFormTitle.textContent = "新增模板";
  saveTemplateBtn.textContent = "儲存模板";
  renderTemplatePreview();
}

function resetDefaultTemplates() {
  if (!confirm("確定還原預設模板？現有自訂模板會被覆蓋。")) return;
  templates = cloneDefaultTemplates();
  saveTemplates();
  renderTemplates();
  resetTemplateForm();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

goSettingsBtn.addEventListener("click", () => showPage("settingsPage"));

csvInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  recipientsInput.value = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join("\n");
  saveState();
  renderPreview();
});

messageInput.addEventListener("input", () => { saveState(); renderPreview(); });
recipientsInput.addEventListener("input", () => { saveState(); renderPreview(); });
intervalInput.addEventListener("input", saveState);
templateContentInput.addEventListener("input", renderTemplatePreview);

startBtn.addEventListener("click", startSending);
pauseBtn.addEventListener("click", pauseSending);
stopBtn.addEventListener("click", stopSending);
document.getElementById("exportBtn").addEventListener("click", exportLogs);
document.getElementById("demoBtn").addEventListener("click", loadDemo);
saveTemplateBtn.addEventListener("click", saveTemplateFromForm);
resetTemplateFormBtn.addEventListener("click", resetTemplateForm);
resetDefaultTemplatesBtn.addEventListener("click", resetDefaultTemplates);

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("確定清除發送頁面資料？模板設定不會被刪除。")) return;
  messageInput.value = "";
  recipientsInput.value = "";
  intervalInput.value = 3;
  logs = [];
  localStorage.removeItem("waFlowState");
  renderLog();
  renderPreview();
});

loadState();
loadTemplates();
renderTemplates();
renderPreview();
renderTemplatePreview();
