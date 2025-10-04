// client-side auth helper: session-based flow with validation and inline errors
(function () {
  function showError(form, message) {
    let el = form.querySelector(".form-error");
    if (!el) {
      el = document.createElement("div");
      el.className = "form-error";
      el.style.color = "#b91c1c";
      el.style.marginTop = "12px";
      el.style.fontSize = "13px";
      form.insertBefore(el, form.firstChild);
    }
    el.textContent = message;
  }

  function clearError(form) {
    const el = form.querySelector(".form-error");
    if (el) el.textContent = "";
  }

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll('form[data-auth="true"]');
    forms.forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError(form);
        const data = Object.fromEntries(new FormData(form).entries());
        if (!data.email || !validateEmail(data.email)) {
          showError(form, "Please enter a valid email address");
          return;
        }
        if (!data.password || data.password.length < 6) {
          showError(form, "Password must be at least 6 characters");
          return;
        }
        try {
          const res = await fetch(form.action || window.location.pathname, {
            method: form.method || "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });
          const json = await res.json();
          if (!res.ok) {
            showError(
              form,
              json.error || json.message || "Authentication failed"
            );
            return;
          }
          // on success the server stored session and set httpOnly cookie — redirect
          window.location = "/dashboard";
        } catch (err) {
          console.error(err);
          showError(form, "Network error — please try again");
        }
      });
    });

    // logout
    const logoutEls = document.querySelectorAll('[data-logout="true"]');
    logoutEls.forEach((el) =>
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const res = await fetch("/logout", {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            window.location = "/login";
          } else showError(document.body, "Could not logout");
        } catch (err) {
          console.error(err);
          showError(document.body, "Network error");
        }
      })
    );
  });
})();
