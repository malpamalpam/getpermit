import { inputBase, labelBase, PREFERRED_LANGUAGE_OPTIONS } from "./constants";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionD({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("phoneNumber")} *</label>
          <input type="tel" value={v("phoneNumber")} onChange={(e) => onChange("phoneNumber", e.target.value)} placeholder="+48 000 000 000" className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("contactEmail")} *</label>
          <input type="email" value={v("contactEmail")} onChange={(e) => onChange("contactEmail", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("additionalPhone")}</label>
          <input type="tel" value={v("additionalPhone")} onChange={(e) => onChange("additionalPhone", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("preferredLanguage")} *</label>
          <select value={v("preferredLanguage")} onChange={(e) => onChange("preferredLanguage", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {PREFERRED_LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{t(`options.preferredLanguage.${l}`)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
