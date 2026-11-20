// Browser side of passkeys. The page loads @simplewebauthn/browser first,
// which provides window.SimpleWebAuthnBrowser.
//
// Each button runs the same two rounds: ask the server for options, hand them
// to the browser (which shows its own passkey prompt), send the answer back.
const { startRegistration, startAuthentication, browserSupportsWebAuthn } = window.SimpleWebAuthnBrowser;
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const statusBox = document.querySelector('[data-passkey-status]');

function showStatus(text, tone) {
  if (!statusBox) return;
  statusBox.textContent = text;
  statusBox.className = tone;
  statusBox.hidden = false;
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong.');
  return data;
}

async function addPasskey() {
  const name = document.querySelector('[name="passkey_name"]')?.value;
  const optionsJSON = await postJson('/account/passkeys/options');
  const response = await startRegistration({ optionsJSON });
  const { redirectTo } = await postJson('/account/passkeys/verify', { response, name });
  window.location.assign(redirectTo);
}

async function logInWithPasskey() {
  const optionsJSON = await postJson('/login/passkey/options');
  const response = await startAuthentication({ optionsJSON });
  const { redirectTo } = await postJson('/login/passkey/verify', { response });
  window.location.assign(redirectTo);
}

function wire(selector, action) {
  const button = document.querySelector(selector);
  if (!button) return;
  if (!browserSupportsWebAuthn()) {
    button.disabled = true;
    showStatus('This browser does not support passkeys.', 'error');
    return;
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    showStatus('Waiting for your device...', 'notice');
    try {
      await action();
    } catch (err) {
      // NotAllowedError means the person closed the prompt or it timed out.
      showStatus(err.name === 'NotAllowedError' ? 'The passkey prompt was closed. Try again when you are ready.' : err.message, 'error');
      button.disabled = false;
    }
  });
}

wire('[data-passkey-register]', addPasskey);
wire('[data-passkey-login]', logInWithPasskey);
