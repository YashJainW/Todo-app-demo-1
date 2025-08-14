import { I18n } from "i18n-js";
import * as Localization from "expo-localization";

import en from "./en.json";
import es from "./es.json";

// Create a new i18n instance
const i18n = new I18n({
  en,
  es,
});

// Set the locale once at the beginning of your app.
i18n.locale = Localization.getLocales()[0]?.languageCode || "en";

// When a value is missing from a language it'll fall back to another language with the key missing.
i18n.defaultLocale = "en";

export default i18n;
