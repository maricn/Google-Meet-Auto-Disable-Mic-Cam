/**
 * @typedef Settings
 * @property {boolean} disableMic
 * @property {boolean} disableCam
 */

/** @type {Settings} */
const defaultSettings = {
  disableMic: true,
  disableCam: true,
  autoJoin: false,
};

/**
 * @typedef ButtonProps
 * @property {string} label
 * @property {string} key
 * @property {string} storageName
 * @property {'left'|'right'|'bottom'} direction
 * @property {HTMLDivElement} element
 * @property {HTMLDivElement} parentElement
 * @property {boolean} forceDisable
 */

/** @type {ButtonProps[]} */
const buttons = [
  {
    label: "Auto Disable Microphone",
    storageName: "disableMic",
    key: "d",
    direction: "right",
    element: null,
    parentElement: null,
  },
  {
    label: "Auto Disable Camera",
    storageName: "disableCam",
    key: "e",
    direction: "left",
    element: null,
    parentElement: null,
  },
  {
    label: "Auto Join",
    storageName: "autoJoin",
    key: null,
    direction: "bottom",
    element: null,
    parentElement: null,
  },
];

/** @type {Promise<Settings>} */
const settingsLoaded = new Promise((resolve) =>
  chrome.storage.sync.get(resolve)
);

/** @type {Promise<void>} */
const windowLoaded = new Promise(
  (resolve) => (window.onload = () => setTimeout(() => resolve(), 1000))
);

/** @type {Promise<void>} */
const buttonsLoaded = new Promise(async (resolve) => {
  await windowLoaded;

  window.addEventListener("keydown", (e) => {
    buttons.forEach((b) => (b.forceDisable = e.shiftKey));
  });
  window.addEventListener("keyup", (e) => {
    buttons.forEach((b) => (b.forceDisable = e.shiftKey));
  });

  /** @type {MutationObserver} */
  const observer = new MutationObserver(() => {
    if (
      !buttons.every((button) => {
        if (["disableCam", "disableMic"].includes(button.storageName)) {
          return (
            (button.element = document.body.querySelector(
              `div[role="button"][aria-label$=" + ${button.key})" i][data-is-muted]`
            )) && (button.parentElement = button.element.parentElement)
          );
        } else {
          return (
            (button.element = document.body.querySelector(
              // 'div[role="button"][tabindex="0"][jsshadow].uArJ5e.UQuaGc'
              "button.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-k8QpJ"
            )) &&
            (button.parentElement =
              document.body.querySelector("div.oORaUb.NONs6c"))
          );
        }
      })
    )
      return;

    observer.disconnect();
    resolve();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});

Promise.all([settingsLoaded, buttonsLoaded]).then(async ([settings = {}]) => {
  settings = { ...defaultSettings, ...settings };

  buttons.forEach((b) => {
    const { label, storageName, direction, element, parentElement } = b;
    /** @type {boolean} */
    const autoTrigger = settings[storageName] === true;

    /** @return {void} */
    const trigger = () => {
      if (element.dataset.isMuted === "false" || storageName == "autoJoin")
        element.click();
    };

    /** @type {HTMLDivElement} */
    const tempDivEl = document.createElement("div");
    tempDivEl.innerHTML = `
          <label style="color:white; position:absolute; ${direction}:100px; z-index:1; cursor:pointer; white-space:nowrap;">
            <input type="checkbox" ${
              autoTrigger ? "checked" : ""
            } style="cursor:pointer; margin:0 4px 0 0; position:relative; top:1px;"/>
            <span>${label}</span>
          </label>
        `;
    // console.log(`${storageName}: ${tempDivEl.innerHTML}`);

    /** @type {HTMLInputElement} */
    const checkboxEl = tempDivEl.querySelector("input");
    checkboxEl.addEventListener("change", ({ currentTarget }) => {
      if (currentTarget.checked && storageName != "autoJoin") trigger();

      settings[storageName] = currentTarget.checked;

      chrome.storage.sync.set(settings);
    });
    parentElement.append(tempDivEl.children[0]);
    // console.log(`${storageName}: ${parentElement.innerHTML}`);

    if (!autoTrigger || b.forceDisable) return;

    trigger();
  });
});
