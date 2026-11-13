const doctors = [
  { id: "d1", name: "Алия Садыкова", specialty: "Терапевт", experience: "12 лет опыта", city: "Астана", rating: "4.9", price: "8 000 ₸", color: "#e5f0e9", skin: "#d9a788", hair: "#353b37", availability: "Сегодня, 14:30" },
  { id: "d2", name: "Руслан Ахметов", specialty: "Кардиолог", experience: "15 лет опыта", city: "Астана", rating: "5.0", price: "12 000 ₸", color: "#e8edf5", skin: "#d5a180", hair: "#3d3833", availability: "Сегодня, 16:00" },
  { id: "d3", name: "Мадина Омарова", specialty: "Педиатр", experience: "9 лет опыта", city: "Астана", rating: "4.9", price: "9 000 ₸", color: "#f6eee0", skin: "#ecc2a4", hair: "#5b4034", availability: "Завтра, 10:00" },
  { id: "d4", name: "Данияр Ким", specialty: "Невролог", experience: "11 лет опыта", city: "Астана", rating: "4.8", price: "10 000 ₸", color: "#eeeaf4", skin: "#e0b294", hair: "#38332f", availability: "Сегодня, 17:30" },
  { id: "d5", name: "Асем Нурланова", specialty: "Дерматолог", experience: "8 лет опыта", city: "Астана", rating: "4.9", price: "9 500 ₸", color: "#f2e9e6", skin: "#e6b89a", hair: "#47312e", availability: "Завтра, 12:00" },
  { id: "d6", name: "Марат Беков", specialty: "Терапевт", experience: "17 лет опыта", city: "Астана", rating: "5.0", price: "11 000 ₸", color: "#e7f0f3", skin: "#c99272", hair: "#37312d", availability: "Сегодня, 18:00" }
];

const STORAGE_KEYS = { profiles: "medora-profiles", appointments: "medora-appointments" };
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const toast = document.getElementById("toast");
let activeDoctorId = null;
let currentFilter = "Все";
let currentCity = "астана";
let showAll = false;
let toastTimer;

// These classes model the abstract user hierarchy for the project assignment.
class MedicalUser {
  constructor({ name, email, phone, role }) {
    if (new.target === MedicalUser) {
      throw new TypeError("MedicalUser is an abstract class.");
    }
    if (!name || !email || !role) {
      throw new TypeError("Имя, email и роль обязательны.");
    }
    this.name = name;
    this.email = email.toLowerCase();
    this.phone = phone || "";
    this.role = role;
  }

  getDashboardLabel() {
    throw new Error("Метод getDashboardLabel() должен быть реализован.");
  }

  toProfile() {
    return { name: this.name, email: this.email, phone: this.phone, role: this.role };
  }
}

class Patient extends MedicalUser {
  constructor(details) {
    super({ ...details, role: "patient" });
  }

  getDashboardLabel() {
    return "Личный кабинет пациента";
  }
}

class Doctor extends MedicalUser {
  constructor(details) {
    super({ ...details, role: "doctor" });
    if (!details.specialty || !details.clinic) {
      throw new TypeError("Для регистрации врача нужны специальность и клиника.");
    }
    this.specialty = details.specialty;
    this.clinic = details.clinic;
    this.experience = details.experience || "";
  }

  getDashboardLabel() {
    return "Кабинет врача · " + this.specialty;
  }

  toProfile() {
    return { ...super.toProfile(), specialty: this.specialty, clinic: this.clinic, experience: this.experience };
  }
}

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    showToast("Не удалось прочитать данные браузера.");
    return [];
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showToast("Браузер не смог сохранить данные. Проверьте настройки хранилища.");
    return false;
  }
}

function renderDoctors() {
  const filtered = doctors.filter(doctor =>
    (currentFilter === "Все" || doctor.specialty === currentFilter) &&
    (!currentCity || doctor.city.toLocaleLowerCase("ru").includes(currentCity))
  );
  const visible = showAll || currentFilter !== "Все" ? filtered : filtered.slice(0, 4);
  const grid = document.getElementById("doctorGrid");
  grid.innerHTML = visible.length ? visible.map(doctor => `
    <article class="doctor-card">
      <div class="doctor-photo" style="--photo-bg:${doctor.color};--skin:${doctor.skin};--hair:${doctor.hair}">
        <span class="doctor-tag">${escapeHtml(doctor.specialty)}</span><div class="doctor-portrait" aria-hidden="true"></div>
      </div>
      <div class="doctor-info">
        <h3 class="doctor-name">${escapeHtml(doctor.name)}</h3><div class="doctor-specialty">${escapeHtml(doctor.experience)} · ${escapeHtml(doctor.city)}</div>
        <div class="doctor-meta"><span class="doctor-rating">★ ${doctor.rating}</span><span>${doctor.price}</span></div>
        <button class="doctor-book" data-book="${doctor.id}">Записаться · ${escapeHtml(doctor.availability)}</button>
      </div>
    </article>`).join("") : '<div class="empty-state">По вашему запросу врачи не найдены. Попробуйте другую специальность.</div>';
  document.getElementById("doctorCount").textContent = `Показано ${visible.length} из ${filtered.length} специалистов`;
  document.getElementById("showAllDoctors").hidden = currentFilter !== "Все" || filtered.length <= 4;
  grid.querySelectorAll("[data-book]").forEach(button => button.addEventListener("click", () => openBooking(button.dataset.book)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function openModal(title, subtitle, content) {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalContent.innerHTML = content;
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  const firstInput = modalContent.querySelector("input, select, button");
  if (firstInput) firstInput.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  activeDoctorId = null;
}

function registrationForm(role) {
  const isDoctor = role === "doctor";
  return `
    <div class="form-tabs" role="tablist" aria-label="Тип аккаунта">
      <button class="form-tab ${!isDoctor ? "active" : ""}" type="button" data-role="patient">Я пациент</button>
      <button class="form-tab ${isDoctor ? "active" : ""}" type="button" data-role="doctor">Я врач</button>
    </div>
    <form id="registerForm">
      <div class="form-grid">
        <div class="form-field full"><label for="profileName">Имя и фамилия</label><input id="profileName" name="name" autocomplete="name" required maxlength="80" placeholder="Например, Алия Садыкова"></div>
        <div class="form-field"><label for="profileEmail">Электронная почта</label><input id="profileEmail" name="email" type="email" autocomplete="email" required maxlength="120" placeholder="you@example.com"></div>
        <div class="form-field"><label for="profilePhone">Телефон</label><input id="profilePhone" name="phone" type="tel" autocomplete="tel" maxlength="24" placeholder="+7 (___) ___-__-__"></div>
        ${isDoctor ? `
          <div class="form-field"><label for="profileSpecialty">Специальность</label><select id="profileSpecialty" name="specialty" required><option value="">Выберите</option><option>Терапевт</option><option>Кардиолог</option><option>Педиатр</option><option>Невролог</option><option>Дерматолог</option><option>Другая специальность</option></select></div>
          <div class="form-field"><label for="profileExperience">Опыт работы</label><input id="profileExperience" name="experience" maxlength="40" placeholder="Например, 8 лет"></div>
          <div class="form-field full"><label for="profileClinic">Клиника</label><input id="profileClinic" name="clinic" required maxlength="100" placeholder="Название медицинского центра"></div>` : ""}
      </div>
      <button class="button button-primary modal-submit" type="submit">Создать ${isDoctor ? "кабинет врача" : "аккаунт"} <span aria-hidden="true">→</span></button>
    </form>
    <p class="form-switch">Уже зарегистрированы? <button type="button" id="switchToLogin">Войти по email</button></p>`;
}

function openRegister(role = "patient") {
  openModal("Создать аккаунт", "Выберите тип профиля и заполните данные.", registrationForm(role));
  modalContent.querySelectorAll("[data-role]").forEach(button => button.addEventListener("click", () => openRegister(button.dataset.role)));
  document.getElementById("switchToLogin").addEventListener("click", openLogin);
  document.getElementById("registerForm").addEventListener("submit", submitRegistration);
}

function submitRegistration(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const data = Object.fromEntries(formData.entries());
  const role = modalContent.querySelector('[data-role="doctor"].active') ? "doctor" : "patient";
  let user;
  try {
    user = role === "doctor" ? new Doctor(data) : new Patient(data);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const profiles = readStorage(STORAGE_KEYS.profiles);
  if (profiles.some(profile => profile.email === user.email)) {
    showToast("Аккаунт с таким email уже существует. Войдите в кабинет.");
    return;
  }
  const profile = { ...user.toProfile(), id: `u-${Date.now()}`, createdAt: new Date().toISOString() };
  if (!writeStorage(STORAGE_KEYS.profiles, [...profiles, profile])) return;
  sessionStorage.setItem("medora-current-user", profile.email);
  showToast(`${user.getDashboardLabel()} создан!`);
  renderAccountButton();
  openAccount(profile);
}

function openLogin() {
  openModal("Войти в Medora", "Введите email, указанный при регистрации на этом устройстве.", `
    <form id="loginForm">
      <div class="form-field"><label for="loginEmail">Электронная почта</label><input id="loginEmail" type="email" autocomplete="email" required maxlength="120" placeholder="you@example.com"></div>
      <button class="button button-primary modal-submit" type="submit">Найти мой аккаунт <span aria-hidden="true">→</span></button>
    </form>
    <p class="form-switch">Ещё нет аккаунта? <button type="button" id="switchToRegister">Зарегистрироваться</button></p>`);
  document.getElementById("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const profile = readStorage(STORAGE_KEYS.profiles).find(item => item.email === email);
    if (!profile) {
      showToast("Аккаунт не найден на этом устройстве. Создайте новый.");
      return;
    }
    sessionStorage.setItem("medora-current-user", profile.email);
    renderAccountButton();
    openAccount(profile);
  });
  document.getElementById("switchToRegister").addEventListener("click", () => openRegister());
}

function openAccount(profile) {
  const appointments = readStorage(STORAGE_KEYS.appointments).filter(item => item.email === profile.email);
  const roleLabel = profile.role === "doctor" ? `Кабинет врача · ${escapeHtml(profile.specialty)}` : "Личный кабинет пациента";
  const details = profile.role === "doctor"
    ? `<p>${escapeHtml(profile.clinic)}${profile.experience ? ` · Опыт: ${escapeHtml(profile.experience)}` : ""}</p>`
    : `<p>${escapeHtml(profile.email)}${profile.phone ? ` · ${escapeHtml(profile.phone)}` : ""}</p>`;
  const appointmentItems = appointments.length
    ? appointments.map(item => `<li><strong>${escapeHtml(item.doctorName)}</strong><span>${escapeHtml(item.date)} в ${escapeHtml(item.time)}</span></li>`).join("")
    : "<li><span>Предстоящих записей пока нет.</span></li>";
  const certificateForm = appointments.length ? `
    <section class="certificate-panel" aria-labelledby="certificateTitle">
      <h3 id="certificateTitle">Справка о записи</h3>
      <p>Сформируйте подтверждение записи на приём по данным вашего кабинета.</p>
      <form id="certificateForm">
        <div class="form-field">
          <label for="certificateAppointment">Запись</label>
          <select id="certificateAppointment" name="appointmentId" required>
            ${appointments.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.doctorName)} · ${escapeHtml(item.date)} в ${escapeHtml(item.time)}</option>`).join("")}
          </select>
        </div>
        <div class="form-field">
          <label for="certificateFormat">Формат файла</label>
          <select id="certificateFormat" name="format">
            <option value="pdf">PDF</option>
            <option value="docx">DOCX (Microsoft Word)</option>
          </select>
        </div>
        <button class="button button-primary modal-submit" type="submit">Сформировать справку <span aria-hidden="true">↓</span></button>
      </form>
      <p class="certificate-warning">Демо-документ о записи на приём. Не является медицинским заключением или официальной справкой.</p>
    </section>` : "";
  openModal(roleLabel, `Здравствуйте, ${escapeHtml(profile.name)}. Ваш профиль Medora.`, `
    <div class="account-card"><h3>${escapeHtml(profile.name)}</h3>${details}</div>
    <h3 style="margin:18px 0 0;font-size:13px">Мои записи</h3><ul class="account-list">${appointmentItems}</ul>
    ${certificateForm}
    <button class="button button-primary modal-submit" id="accountBook">Найти врача <span aria-hidden="true">→</span></button>
    <p class="form-switch"><button type="button" id="logoutButton">Выйти из аккаунта</button></p>`);
  const form = document.getElementById("certificateForm");
  if (form) form.addEventListener("submit", event => submitCertificate(event, appointments));
  document.getElementById("accountBook").addEventListener("click", () => { closeModal(); document.getElementById("doctors").scrollIntoView({ behavior: "smooth" }); });
  document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("medora-current-user");
    renderAccountButton();
    closeModal();
    showToast("Вы вышли из аккаунта.");
  });
}

function formatCertificateDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function submitCertificate(event, appointments) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const appointment = appointments.find(item => item.id === formData.get("appointmentId"));
  if (!appointment) {
    showToast("Не удалось найти выбранную запись. Обновите страницу и попробуйте снова.");
    return;
  }

  const certificate = {
    patientName: appointment.name,
    doctorName: appointment.doctorName,
    date: formatCertificateDate(appointment.date),
    time: appointment.time
  };
  if (formData.get("format") === "docx") {
    downloadCertificateDocx(certificate);
  } else {
    printCertificatePdf(certificate);
  }
}

function printCertificatePdf(certificate) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Разрешите всплывающие окна, чтобы сформировать PDF.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>Справка о записи на приём</title>
        <style>
          body { max-width: 700px; margin: 80px auto; padding: 0 40px; color: #172f36; font: 16px Arial, sans-serif; line-height: 1.7; }
          h1 { margin-bottom: 36px; text-align: center; font-size: 24px; }
          .notice { margin-top: 64px; color: #667; font-size: 12px; text-align: center; }
          @media print { body { margin: 0 auto; padding-top: 35mm; } }
        </style>
      </head>
      <body>
        <h1>СПРАВКА О ЗАПИСИ НА ПРИЁМ</h1>
        <p>Настоящим подтверждается, что <strong>${escapeHtml(certificate.patientName)}</strong> записан(а) на приём к врачу <strong>${escapeHtml(certificate.doctorName)}</strong>.</p>
        <p>Дата приёма: <strong>${escapeHtml(certificate.date)}</strong><br>Время приёма: <strong>${escapeHtml(certificate.time)}</strong></p>
        <p class="notice">Демо-документ Medora. Не является медицинским заключением или официальной справкой.</p>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.setTimeout(() => printWindow.print(), 250);
  showToast("В окне печати выберите «Сохранить как PDF».");
}

async function downloadCertificateDocx(certificate) {
  if (!window.docx) {
    showToast("Не удалось загрузить генератор DOCX. Проверьте подключение к интернету и обновите страницу.");
    return;
  }

  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = window.docx;
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "СПРАВКА О ЗАПИСИ НА ПРИЁМ", heading: HeadingLevel.HEADING_1, alignment: "center", spacing: { after: 500 } }),
        new Paragraph({ children: [
          new TextRun("Настоящим подтверждается, что "),
          new TextRun({ text: certificate.patientName, bold: true }),
          new TextRun(" записан(а) на приём к врачу "),
          new TextRun({ text: certificate.doctorName, bold: true }),
          new TextRun("."),
        ], spacing: { after: 260 } }),
        new Paragraph({ children: [new TextRun({ text: `Дата приёма: ${certificate.date}`, bold: true })], spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: `Время приёма: ${certificate.time}`, bold: true })], spacing: { after: 900 } }),
        new Paragraph({ children: [new TextRun({ text: "Демо-документ Medora. Не является медицинским заключением или официальной справкой.", italics: true, color: "667777", size: 20 })], alignment: "center" })
      ]
    }]
  });

  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spravka-o-zapisi.docx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Справка DOCX сформирована.");
  } catch (error) {
    showToast("Не удалось сформировать DOCX. Попробуйте ещё раз.");
  }
}

function openBooking(doctorId) {
  const doctor = doctors.find(item => item.id === doctorId);
  if (!doctor) return;
  activeDoctorId = doctorId;
  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  openModal("Запись на приём", "Оставьте контактные данные и выберите удобное время.", `
    <div class="booking-doctor"><strong>${escapeHtml(doctor.name)}</strong><br>${escapeHtml(doctor.specialty)} · ${doctor.price}</div>
    <form id="bookingForm">
      <div class="form-grid">
        <div class="form-field full"><label for="bookingName">Ваше имя</label><input id="bookingName" name="name" required maxlength="80" autocomplete="name" placeholder="Имя и фамилия"></div>
        <div class="form-field"><label for="bookingEmail">Email для связи</label><input id="bookingEmail" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="you@example.com"></div>
        <div class="form-field"><label for="bookingDate">Дата</label><input id="bookingDate" name="date" type="date" min="${minDate}" value="${minDate}" required></div>
        <div class="form-field full"><label for="bookingTime">Время приёма</label><select id="bookingTime" name="time" required><option>10:00</option><option>11:30</option><option>14:30</option><option>16:00</option><option>17:30</option></select></div>
      </div>
      <button class="button button-primary modal-submit" type="submit">Подтвердить запись <span aria-hidden="true">→</span></button>
    </form>`);
  document.getElementById("bookingForm").addEventListener("submit", submitBooking);
  const currentUser = readStorage(STORAGE_KEYS.profiles).find(item => item.email === sessionStorage.getItem("medora-current-user"));
  if (currentUser) {
    document.getElementById("bookingName").value = currentUser.name;
    document.getElementById("bookingEmail").value = currentUser.email;
  }
}

function submitBooking(event) {
  event.preventDefault();
  const doctor = doctors.find(item => item.id === activeDoctorId);
  if (!doctor) return;
  const formData = new FormData(event.currentTarget);
  const appointment = {
    id: `a-${Date.now()}`,
    doctorId: doctor.id,
    doctorName: doctor.name,
    name: String(formData.get("name")).trim(),
    email: String(formData.get("email")).trim().toLowerCase(),
    date: String(formData.get("date")),
    time: String(formData.get("time"))
  };
  if (!writeStorage(STORAGE_KEYS.appointments, [...readStorage(STORAGE_KEYS.appointments), appointment])) return;
  closeModal();
  showToast(`Вы записаны к ${doctor.name}. Запись сохранена в браузере.`);
}

function renderAccountButton() {
  const button = document.getElementById("loginButton");
  const email = sessionStorage.getItem("medora-current-user");
  const profile = email && readStorage(STORAGE_KEYS.profiles).find(item => item.email === email);
  button.innerHTML = profile ? `<span aria-hidden="true">♙</span> Кабинет` : '<span aria-hidden="true">♙</span> Войти';
  button.onclick = () => profile ? openAccount(profile) : openLogin();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

document.querySelectorAll("[data-open-register]").forEach(button => button.addEventListener("click", () => openRegister()));
document.getElementById("modalClose").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modalBackdrop.hidden) closeModal(); });
document.getElementById("menuToggle").addEventListener("click", event => {
  const nav = document.getElementById("mainNav");
  const isOpen = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});
document.querySelectorAll("#mainNav a").forEach(link => link.addEventListener("click", () => {
  document.getElementById("mainNav").classList.remove("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
}));
document.querySelectorAll(".filter-chip").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
  button.classList.add("active");
  currentFilter = button.dataset.filter;
  renderDoctors();
}));
document.getElementById("searchButton").addEventListener("click", () => {
  const specialty = document.getElementById("specialtySearch").value;
  currentFilter = specialty || "Все";
  currentCity = document.getElementById("citySearch").value.trim().toLocaleLowerCase("ru");
  showAll = true;
  document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === currentFilter));
  renderDoctors();
  document.getElementById("doctors").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("showAllDoctors").addEventListener("click", event => {
  event.preventDefault();
  showAll = !showAll;
  event.currentTarget.innerHTML = showAll ? 'Свернуть <span aria-hidden="true">↑</span>' : 'Показать всех <span aria-hidden="true">→</span>';
  renderDoctors();
});

renderDoctors();
renderAccountButton();
