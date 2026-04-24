const topics = [
  "Any outstanding high priority items outstanding from the previous shift?",
  "Hub Queue Report",
  "Exchange Server Health",
  "AD Domain Health",
  "Dynatrace Alerts (outstanding, or insights to high volume over the previous shift)",
  "Pending emails or actions requiring continued assistance",
  "Current unresolved Exchange advisories",
  "Teams Awareness (open area for something that might not fit into another category)"
];

const DRAFT_SERVICE_URL = "http://localhost:5050/create-draft";

const sectionsContainer = document.getElementById("sectionsContainer");
const template = document.getElementById("sectionTemplate");
const tablePreview = document.getElementById("tablePreview");
const copyBtn = document.getElementById("copyBtn");
const composeEmailBtn = document.getElementById("composeEmailBtn");
const clearBtn = document.getElementById("clearBtn");
const handoffDateInput = document.getElementById("handoffDate");
const shiftNameInput = document.getElementById("shiftName");
const engineerNameInput = document.getElementById("engineerName");

function getWindowsUsername() {
  return new Promise((resolve) => {
    try {
      fetch("http://localhost:5000/api/username")
        .then((res) => res.json())
        .then((data) => resolve(data.username || null))
        .catch(() => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function getHeaderData() {
  return {
    handoffDate: handoffDateInput.value,
    shiftName: shiftNameInput.value.trim(),
    engineerName: engineerNameInput.value.trim()
  };
}

function buildSections() {
  topics.forEach((topic, index) => {
    const clone = template.content.cloneNode(true);
    const label = clone.querySelector(".question-label");
    const editor = clone.querySelector(".rich-editor");

    label.textContent = topic;
    editor.id = `editor-${index}`;
    editor.dataset.topic = topic;

    editor.addEventListener("input", renderOutputs);
    editor.addEventListener("paste", () => {
      setTimeout(renderOutputs, 0);
    });

    sectionsContainer.appendChild(clone);
  });
}

function getSectionData() {
  return Array.from(document.querySelectorAll(".rich-editor")).map((editor) => ({
    topic: editor.dataset.topic,
    html: editor.innerHTML.trim(),
    text: editor.textContent.trim()
  }));
}

function safeDisplayHtml(valueHtml, valueText) {
  if (valueHtml) {
    return valueHtml;
  }

  if (!valueText) {
    return "<em>All good / no updates</em>";
  }

  return escapeHtml(valueText);
}

function renderTablePreview(meta, rows) {
  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #c9d2df;">
      <tbody>
        <tr>
          <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">Handoff Date</th>
          <td style="border:1px solid #c9d2df;padding:10px;text-align:left;">${escapeHtml(formatDate(meta.handoffDate) || "Not set")}</td>
        </tr>
        <tr>
          <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">Shift Type</th>
          <td style="border:1px solid #c9d2df;padding:10px;text-align:left;">${escapeHtml(meta.shiftName || "Not set")}</td>
        </tr>
        <tr>
          <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">Engineer Name</th>
          <td style="border:1px solid #c9d2df;padding:10px;text-align:left;">${escapeHtml(meta.engineerName || "Not set")}</td>
        </tr>
      </tbody>
    </table>
    <br />
    <table style="width:100%;border-collapse:collapse;border:1px solid #c9d2df;">
      <thead>
        <tr>
          <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">Topic</th>
          <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">Shift Handoff Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <th style="border:1px solid #c9d2df;padding:10px;background:#eef3f9;font-weight:600;text-align:left;">${escapeHtml(row.topic)}</th>
                <td style="border:1px solid #c9d2df;padding:10px;text-align:left;">${safeDisplayHtml(row.html, row.text)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  tablePreview.innerHTML = tableHtml;
  return tableHtml;
}

function buildDraftHtml(meta, tableHtml) {
  const dateLabel = formatDate(meta.handoffDate) || formatDate(new Date().toISOString().slice(0, 10));
  return `
    <div style="font-family: Segoe UI, Arial, sans-serif; font-size: 11pt; color: #1f2328;">
      <p style="margin: 0 0 10px 0;">Please find the shift handoff report below.</p>
      ${tableHtml}
      <p style="margin: 12px 0 0 0; color: #5b6470;">Generated: ${escapeHtml(dateLabel)}</p>
    </div>
  `;
}

function renderOutputs() {
  const meta = getHeaderData();
  const rows = getSectionData();
  renderTablePreview(meta, rows);
}

async function copyHandoffTable() {
  const meta = getHeaderData();
  const rows = getSectionData();
  const html = renderTablePreview(meta, rows);
  const text = [
    `Handoff Date: ${formatDate(meta.handoffDate) || "Not set"}`,
    `Shift Type: ${meta.shiftName || "Not set"}`,
    `Engineer Name: ${meta.engineerName || "Not set"}`,
    "",
    ...rows.map((row) => `${row.topic}\n${row.text || "All good / no updates"}`)
  ].join("\n\n");

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
      });

      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(text);
    }

    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy Handoff Table";
    }, 1200);
  } catch (error) {
    copyBtn.textContent = "Copy Failed";
    setTimeout(() => {
      copyBtn.textContent = "Copy Handoff Table";
    }, 1500);
  }
}

async function openOutlookDraft() {
  const meta = getHeaderData();
  const rows = getSectionData();
  const dateLabel = formatDate(meta.handoffDate) || formatDate(new Date().toISOString().slice(0, 10));
  const subject = `Shift Handoff Report - ${dateLabel}`;
  const tableHtml = renderTablePreview(meta, rows);
  const htmlBody = buildDraftHtml(meta, tableHtml);

  composeEmailBtn.disabled = true;
  const originalText = composeEmailBtn.textContent;
  composeEmailBtn.textContent = "Opening...";

  try {
    const response = await fetch(DRAFT_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: "meds@deloitte.com",
        subject,
        htmlBody
      })
    });

    if (!response.ok) {
      throw new Error("Draft service unavailable");
    }

    composeEmailBtn.textContent = "Opened";
    setTimeout(() => {
      composeEmailBtn.textContent = originalText;
      composeEmailBtn.disabled = false;
    }, 1200);
  } catch (error) {
    composeEmailBtn.textContent = originalText;
    composeEmailBtn.disabled = false;
    alert("Unable to open Outlook HTML draft. Start outlook-draft-service.ps1 first.");
  }
}

function clearAll() {
  shiftNameInput.value = "";
  engineerNameInput.value = "";

  document.querySelectorAll(".rich-editor").forEach((editor) => {
    editor.innerHTML = "";
  });

  renderOutputs();
}

copyBtn.addEventListener("click", copyHandoffTable);
composeEmailBtn.addEventListener("click", openOutlookDraft);
clearBtn.addEventListener("click", clearAll);
handoffDateInput.addEventListener("input", renderOutputs);
shiftNameInput.addEventListener("input", renderOutputs);
engineerNameInput.addEventListener("input", renderOutputs);

handoffDateInput.value = new Date().toISOString().slice(0, 10);

const savedEngineerName = localStorage.getItem("engineerName");
if (savedEngineerName) {
  engineerNameInput.value = savedEngineerName;
}

engineerNameInput.addEventListener("change", () => {
  if (engineerNameInput.value.trim()) {
    localStorage.setItem("engineerName", engineerNameInput.value.trim());
  }
});

getWindowsUsername().then((username) => {
  if (username && !savedEngineerName) {
    engineerNameInput.value = username;
    localStorage.setItem("engineerName", username);
    renderOutputs();
  }
});

buildSections();
renderOutputs();
