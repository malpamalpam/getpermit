import { inputBase, labelBase, VISA_TYPE_OPTIONS } from "./constants";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionB({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("passportNumber")} *</label>
          <input type="text" value={v("passportNumber")} onChange={(e) => onChange("passportNumber", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("passportSeries")}</label>
          <input type="text" value={v("passportSeries")} onChange={(e) => onChange("passportSeries", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("passportIssueDate")} *</label>
          <input type="date" value={v("passportIssueDate")} onChange={(e) => onChange("passportIssueDate", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("passportExpiryDate")} *</label>
          <input type="date" value={v("passportExpiryDate")} onChange={(e) => onChange("passportExpiryDate", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("passportIssuingAuthority")} *</label>
        <input type="text" value={v("passportIssuingAuthority")} onChange={(e) => onChange("passportIssuingAuthority", e.target.value)} className={inputBase} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("pesel")}</label>
          <input type="text" maxLength={11} value={v("pesel")} onChange={(e) => onChange("pesel", e.target.value)} placeholder="00000000000" className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("residenceCardNumber")}</label>
          <input type="text" value={v("residenceCardNumber")} onChange={(e) => onChange("residenceCardNumber", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("residenceCardExpiry")}</label>
        <input type="date" value={v("residenceCardExpiry")} onChange={(e) => onChange("residenceCardExpiry", e.target.value)} className={inputBase} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className={labelBase}>{t("visaNumber")}</label>
          <input type="text" value={v("visaNumber")} onChange={(e) => onChange("visaNumber", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("visaType")}</label>
          <select value={v("visaType")} onChange={(e) => onChange("visaType", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {VISA_TYPE_OPTIONS.map((vt) => (
              <option key={vt} value={vt}>{t(`options.visaType.${vt}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelBase}>{t("visaExpiry")}</label>
          <input type="date" value={v("visaExpiry")} onChange={(e) => onChange("visaExpiry", e.target.value)} className={inputBase} />
        </div>
      </div>
    </div>
  );
}
