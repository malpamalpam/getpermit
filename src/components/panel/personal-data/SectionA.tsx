import { inputBase, labelBase, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from "./constants";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionA({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("firstNameLatin")} *</label>
          <input type="text" value={v("firstNameLatin")} onChange={(e) => onChange("firstNameLatin", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("lastNameLatin")} *</label>
          <input type="text" value={v("lastNameLatin")} onChange={(e) => onChange("lastNameLatin", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("nativeFullName")}</label>
        <input type="text" value={v("nativeFullName")} onChange={(e) => onChange("nativeFullName", e.target.value)} className={inputBase} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("gender")} *</label>
          <select value={v("gender")} onChange={(e) => onChange("gender", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{t(`options.gender.${g}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelBase}>{t("dateOfBirth")} *</label>
          <input type="date" value={v("dateOfBirth")} onChange={(e) => onChange("dateOfBirth", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("placeOfBirth")} *</label>
          <input type="text" value={v("placeOfBirth")} onChange={(e) => onChange("placeOfBirth", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("countryOfBirth")} *</label>
          <input type="text" value={v("countryOfBirth")} onChange={(e) => onChange("countryOfBirth", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("citizenship")} *</label>
          <input type="text" value={v("citizenship")} onChange={(e) => onChange("citizenship", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("secondCitizenship")}</label>
          <input type="text" value={v("secondCitizenship")} onChange={(e) => onChange("secondCitizenship", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("nationality")}</label>
          <input type="text" value={v("nationality")} onChange={(e) => onChange("nationality", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("maritalStatus")} *</label>
          <select value={v("maritalStatus")} onChange={(e) => onChange("maritalStatus", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {MARITAL_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{t(`options.maritalStatus.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("fatherName")} *</label>
          <input type="text" value={v("fatherName")} onChange={(e) => onChange("fatherName", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("motherName")} *</label>
          <input type="text" value={v("motherName")} onChange={(e) => onChange("motherName", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("motherMaidenName")}</label>
        <input type="text" value={v("motherMaidenName")} onChange={(e) => onChange("motherMaidenName", e.target.value)} className={inputBase} />
      </div>
    </div>
  );
}
